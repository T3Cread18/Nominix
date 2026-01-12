from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, PayrollPeriod
from payroll_core.engine import PayrollEngine
from customers.models import Client
from decimal import Decimal

def run():
    schema = 'gfo'
    with schema_context(schema):
        print(f"\n--- TESTING SCHEMA: {schema} ---")
        contract = LaborContract.objects.filter(is_active=True).first()
        period = PayrollPeriod.objects.all().order_by('-id').first()
        
        if not contract:
            print("ERROR: No active contract found.")
            return
        if not period:
            print("ERROR: No periods found.")
            return
            
        print(f"Employee: {contract.employee.full_name}")
        print(f"Contract Salary: {contract.salary_amount} {contract.salary_currency.code}")
        print(f"Period: {period.start_date} - {period.end_date} ({period.status})")
        
        try:
            engine = PayrollEngine(contract=contract, period=period)
            result = engine.calculate_payroll()
            
            print("\nCalculation Results (Lines):")
            for line in result['lines']:
                q = line.get('quantity', '0.00')
                u = line.get('unit', '')
                print(f"  [{line['code']}] {line['name']}: {line['amount_ves']} | Q: {q} {u}")
        except Exception as e:
            print(f"ENGINE ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    run()
