import os
import django
import sys
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, Employee, Company
from payroll_core.services.salary import SalarySplitter
from decimal import Decimal

def log(msg):
    print(msg, flush=True)

try:
    with schema_context('grupo_farmacias_ospino'):
        emp = Employee.objects.get(first_name='Lorena Katiuska', last_name='Barrios Garcia')
        contract = LaborContract.objects.get(employee=emp, is_active=True)
        
        log(f"Contract: {contract.id}")
        
        # Check SalarySplitter
        rate = Decimal('349.9272')
        log("Calling SalarySplitter...")
        try:
            breakdown = SalarySplitter.get_salary_breakdown(contract, exchange_rate=rate)
            log(f"SPLITTER RESULT: Base={breakdown['base']} | Comp={breakdown['complement']}")
        except Exception as e:
            log("ERROR IN SPLITTER:")
            traceback.print_exc()

except Exception as e:
    log("GLOBAL ERROR:")
    traceback.print_exc()
