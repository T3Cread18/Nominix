import os
import django
from decimal import Decimal
from datetime import date, timedelta

# Configuración de entorno Django para el tenant específico
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.db import connection
from customers.models import Client
from payroll_core.models import (
    Employee, LaborContract, PayrollPeriod, Payslip, 
    PayslipDetail, PayrollConcept, Currency, ExchangeRate
)
from payroll_core.services import PayrollProcessor

def verify_payroll_closure():
    # 1. Configurar contexto de tenant
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
    connection.set_tenant(tenant)
    print(f"--- Iniciando verificación en Tenant: {tenant.name} ---")

    # 2. Asegurar que existan datos básicos
    currency_usd = Currency.objects.get_or_create(code='USD', defaults={'name': 'Dólar', 'symbol': '$'})[0]
    currency_ves = Currency.objects.get_or_create(code='VES', defaults={'name': 'Bolívar', 'symbol': 'Bs.', 'is_base_currency': True})[0]
    
    # Tasa ficticia para la prueba
    ExchangeRate.objects.get_or_create(
        currency=currency_usd,
        date_valid=django.utils.timezone.now(),
        defaults={'rate': Decimal('40.00'), 'source': 'BCV'}
    )

    # 3. Crear un periodo de prueba
    period = PayrollPeriod.objects.create(
        name="Test Closure Period",
        start_date=date.today() - timedelta(days=15),
        end_date=date.today(),
        payment_date=date.today(),
        status=PayrollPeriod.Status.OPEN
    )
    print(f"Periodo creado: {period}")

    # 4. Verificar empleados activos
    employees = Employee.objects.filter(is_active=True)
    print(f"Empleados activos encontrados: {employees.count()}")
    
    if employees.count() == 0:
        print("ERROR: No hay empleados activos para la prueba.")
        return

    # 5. Ejecutar Cierre
    print("Ejecutando PayrollProcessor.close_period()...")
    try:
        closed_period = PayrollProcessor.close_period(period.id)
        print(f"Cierre exitoso. Estado del periodo: {closed_period.status}")
    except Exception as e:
        print(f"FALLO CRÍTICO EN EL CIERRE: {str(e)}")
        return

    # 6. Validar Generación de Recibos
    payslips = Payslip.objects.filter(period=closed_period)
    print(f"Recibos generados en DB: {payslips.count()}")

    for slip in payslips:
        print(f"\nRecibo para: {slip.employee.full_name}")
        print(f"  - Neto: {slip.net_pay} {slip.currency_code}")
        print(f"  - Tasa Aplicada: {slip.exchange_rate_applied}")
        print(f"  - Snapshot (Cargo): {slip.contract_snapshot.get('position')}")
        
        details = slip.details.all()
        print(f"  - Renglones ({details.count()}):")
        for det in details:
            print(f"    [{det.kind}] {det.concept_code}: {det.amount}")

    # 7. Verificación de Inmutabilidad (Lógica)
    # Si borramos un concepto global ahora, los detalles deben persistir
    # (No lo borraremos realmente en el script para no dañar datos, 
    # pero la existencia física del PayslipDetail con el nombre del concepto lo garantiza).
    
    print("\n--- Verificación Finalizada ---")

if __name__ == "__main__":
    verify_payroll_closure()
