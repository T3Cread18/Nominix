from payroll_core.models import LaborContract, PayrollPeriod, Company, PayrollConcept
from payroll_core.engine import PayrollEngine
import json
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super(DecimalEncoder, self).default(obj)

def run():
    contract = LaborContract.objects.filter(is_active=True).first()
    if not contract:
        print("No active contract found")
        return
        
    period = PayrollPeriod.objects.first()
    if not period:
        print("No period found")
        return
        
    print(f"Testing for Employee: {contract.employee.full_name}")
    print(f"Contract Salary: {contract.salary_amount} {contract.salary_currency.code}")
    
    comp = Company.objects.first()
    print(f"Company Split Mode: {comp.salary_split_mode}")
    
    engine = PayrollEngine(contract, period)
    data = engine.calculate_payroll()
    
    print("\nCalculation Results:")
    print(f"Total Income: {data['totals']['income_ves']} VES")
    print(f"Lines count: {len(data['lines'])}")
    
    for line in data['lines']:
        print(f"- {line['code']}: {line['amount_ves']} ({line['name']})")

run()
