import os
import django
import sys
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, Employee
from payroll_core.engine import PayrollEngine
from decimal import Decimal

def log(msg):
    print(msg, flush=True)

try:
    with schema_context('grupo_farmacias_ospino'):
        emp = Employee.objects.get(first_name='Lorena Katiuska', last_name='Barrios Garcia')
        contract = LaborContract.objects.get(employee=emp, is_active=True)
        
        log(f"Contract: {contract.id}")
        
        # Simulate Engine
        engine = PayrollEngine(contract)
        
        # Mock Rate to match previous test
        rate = Decimal('349.9272')
        class MockRate:
            rate = Decimal('349.9272')
        engine.exchange_rate_obj = MockRate()
        engine._cached_rate_value = rate
        
        context = engine._build_eval_context()
        
        log(f"SALARIO_MENSUAL: {context.get('SALARIO_MENSUAL')}")
        log(f"SUELDO_BASE_MENSUAL: {context.get('SUELDO_BASE_MENSUAL')}")
        log(f"COMPLEMENTO_MENSUAL: {context.get('COMPLEMENTO_MENSUAL')}")

except Exception as e:
    log("GLOBAL ERROR:")
    traceback.print_exc()
