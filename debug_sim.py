from django_tenants.utils import schema_context
from payroll_core.models import Employee, PayrollPeriod, LaborContract
from payroll_core.engine import PayrollEngine
import json
from decimal import Decimal

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def run():
    schema = 'gfo'
    with schema_context(schema):
        print(f"\n--- API JSON DEBUG: {schema} ---")
        emp = Employee.objects.filter(is_active=True).first()
        period = PayrollPeriod.objects.filter(status='OPEN').first() or PayrollPeriod.objects.first()
        contract = emp.contracts.filter(is_active=True).first()
        
        engine = PayrollEngine(contract=contract, period=period)
        result = engine.calculate_payroll()
        
        # Simular serialización DRF
        print(json.dumps(result, indent=2, default=decimal_default))

if __name__ == "__main__":
    run()
