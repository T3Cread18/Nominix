import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, Employee, Company
from payroll_core.engine import PayrollEngine
from decimal import Decimal

with schema_context('grupo_farmacias_ospino'):
    emp = Employee.objects.get(first_name='Lorena Katiuska', last_name='Barrios Garcia')
    contract = LaborContract.objects.get(employee=emp, is_active=True)
    
    engine = PayrollEngine(contract)
    # Mock rate
    rate = Decimal('349.9272')
    class MockRate:
        rate = Decimal('349.9272')
    engine.exchange_rate_obj = MockRate()
    engine._cached_rate_value = rate
    
    payroll = engine.calculate_payroll()
    
    print("--- PAYROLL RESULTS ---")
    for line in payroll['lines']:
        if line['code'] == 'SUELDO_BASE':
            print(f"BASE_AMOUNT: {line['amount_ves']}")
        if line['code'] == 'COMPLEMENTO':
            print(f"COMP_AMOUNT: {line['amount_ves']}")
