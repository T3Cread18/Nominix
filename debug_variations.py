import os
import django
import sys
from datetime import date
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from customers.models import Client

# Note: Models must be imported AFTER setting context or inside functions usually,
# but for scripts, clean imports work if context is active during access.
from payroll_core.models import Employee, VariationCause, EmployeeVariation, Company, LaborContract, PayrollPeriod
from payroll_core.services.variations_engine import VariationsEngine
from payroll_core.engine import PayrollEngine

def run_test():
    print("--- INICIANDO TEST DE VARIACIONES (SCHEMA AWARE) ---")

    # 1. Obtener Tenant
    client = Client.objects.first()
    if not client:
        print("❌ No hay Clientes/Tenants creados. Ejecuta 'create_tenant.py' o crea uno desde Admin.")
        return

    print(f"🏢 Usando Tenant: {client.name} (Schema: {client.schema_name})")

    with schema_context(client.schema_name):
        # 1. Setup Data dentro del Schema
        company, _ = Company.objects.get_or_create(name="Test Company", defaults={'rif':"J-12345678-9"})
        employee = Employee.objects.first()
        if not employee:
            print("❌ Necesitamos al menos un empleado en este tenant para probar.")
            return

        print(f"👤 Usando empleado: {employee}")

        # Causa: Vacaciones
        cause_vac, _ = VariationCause.objects.update_or_create(
            code='VAC_TEST',
            defaults={
                'name': 'Vacaciones Test',
                'category': 'VACATION',
                'affects_salary_days': True,
                'pay_concept_code': 'VACACIONES'
            }
        )
        print(f"📄 Causa de Variación: {cause_vac}")

        # Limpiar variaciones previas para este test
        EmployeeVariation.objects.filter(employee=employee, cause__code__in=['VAC_TEST']).delete()

        # 2. Prueba de Solapamiento
        print("\n[TEST 1] Validación de Solapamiento")
        v1 = EmployeeVariation.objects.create(
            employee=employee,
            cause=cause_vac,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 5) # 5 días
        )
        print(f"  -> Creada Variación Inicial: {v1}")

        try:
            VariationsEngine.validate_overlap(employee, date(2026, 1, 4), date(2026, 1, 6))
            print("  ❌ FALLO: No detectó solapamiento (4-6 vs 1-5)")
        except ValueError as e:
            print(f"  ✅ ÉXITO: Detectó solapamiento correctamente: {e}")

        # 3. Prueba de Impacto en Nómina
        print("\n[TEST 2] Impacto en Motor de Nómina")
        
        # Crear contrato ficticio si no tiene
        contract = LaborContract.objects.filter(employee=employee, is_active=True).first()
        if not contract:
            print("  ⚠️ El empleado no tiene contrato activo. Saltando prueba de motor.")
            return

        # Periodo de prueba: 1-15 Enero
        period_start = date(2026, 1, 1)
        period_end = date(2026, 1, 15)
        
        # Simular objeto Period (básico)
        period = PayrollPeriod(
            start_date=period_start,
            end_date=period_end,
            payment_date=period_end,
            name="Quincena Test"
        )
        # Hack para que el motor crea que es persistido si es necesario, 
        # pero Engine soporta objeto en memoria para calculo.
        
        print(f"  -> Contrato ID: {contract.id}, Salario: {contract.salary_amount}")

        engine = PayrollEngine(contract=contract, period=period)
        
        print(f"  -> Días Deducidos (Calculados por Engine): {engine.deducted_days}")
        print(f"  -> Novedades Inyectadas: {engine.input_variables}")

        success_deduction = False
        if engine.deducted_days == 5:
            print("  ✅ Días deducidos correctos (5).")
            success_deduction = True
        else:
            print(f"  ❌ Días deducidos incorrectos. Esperado 5, obtenido {engine.deducted_days}")

        success_novelty = False
        if engine.input_variables.get('VACACIONES') == 5:
            print("  ✅ Variable VACACIONES inyectada correctamente (5).")
            success_novelty = True
        else:
            print(f"  ❌ Variable VACACIONES incorrecta. Esperado 5, obtenido {engine.input_variables.get('VACACIONES')}")

        # 4. Cálculo Completo (Opcional)
        if success_deduction and success_novelty:
            print("\n[TEST 3] Generación de Líneas (Simulada)")
            try:
                result = engine.calculate_payroll()
                lines = result.get('lines', [])
                
                found_salary = False
                found_vacation = False
                
                for line in lines:
                    # Filtramos output relevante
                    if line['code'] in ['SUELDO_BASE', 'VACACIONES', 'BONO_VACACIONAL']:
                        print(f"  -> Línea: {line['code']} | Tipo: {line.get('tipo_recibo')} | Monto: {line.get('amount_ves')} | Cantidad: {line.get('quantity')}")
                    
                    if line.get('tipo_recibo') == 'vacaciones':
                        found_vacation = True
                    if line['code'] == 'SUELDO_BASE': # Verificamos si redujo días (ej: 10 en vez de 15)
                         # Engine usa DIAS de contexto (normalmente 15) - deducted
                         if line.get('quantity') == 10:
                             found_salary = True
                        
                if found_salary:
                    print("  ✅ Sueldo Base reducido a 10 días.")
                else:
                    print(f"  ⚠️ Sueldo Base no parece haber descontado los días (revisar output anterior).")

                if found_vacation:
                    print("  ✅ Se encontraron líneas con tipo_recibo='vacaciones'")
                else:
                    print("  ⚠️ No se encontraron líneas de vacaciones (posiblemente falta fórmula 'VACACIONES').")

            except Exception as e:
                print(f"  ⚠️ Error ejecutando cálculo completo: {e}")

run_test()
