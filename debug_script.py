import os
import django
from django_tenants.utils import schema_context
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from payroll_core.models import LaborContract
from payroll_core.engine import PayrollEngine

def run():
    try:
        with schema_context('grupo_farmacias_ospino'):
            contract = LaborContract.objects.filter(is_active=True).first()
            if not contract:
                return

            with open('simulation_output.txt', 'w', encoding='utf-8') as f:
                f.write(f"--- Simulating for: {contract.employee.full_name} ---\n")
                engine = PayrollEngine(contract, input_variables={})
                res = engine.calculate_payroll()
                for line in res['lines']:
                    f.write(f"[{line['code']}] {line['name']}: {line['amount_ves']} Bs.\n")
                    
            print("Successfully written to simulation_output.txt")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
