import os
import django
from django_tenants.utils import schema_context
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from payroll_core.models import PayrollConcept

def run():
    try:
        with schema_context('grupo_farmacias_ospino'):
            # 1. Corregir Bono Domingo
            bono_domingo = PayrollConcept.objects.filter(code='BONO_DOMINGO').first()
            if bono_domingo:
                print(f"Updating {bono_domingo.name}...")
                bono_domingo.computation_method = 'DYNAMIC_FORMULA'
                bono_domingo.formula = '(SALARIO_DIARIO / 8) * 2.0 * SUNDAY_HOURS'
                bono_domingo.value = Decimal('0.00')
                bono_domingo.save()
                print("Bono Domingo updated to DYNAMIC_FORMULA.")
            else:
                print("Concept BONO_DOMINGO not found.")

            # 2. Asegurar que otros conceptos tengan las variables correctas si es necesario
            # Horas Extra ya parece estar bien: (SALARIO_DIARIO / 8) * 1.5 * OVERTIME_HOURS
            # Bono Nocturno ya parece estar bien: (SALARIO_DIARIO / 8) * 0.30 * NIGHT_HOURS
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
