import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, Employee, Company
from payroll_core.services.salary import SalarySplitter
from decimal import Decimal

with schema_context('grupo_farmacias_ospino'):
    emp = Employee.objects.get(first_name='Lorena Katiuska', last_name='Barrios Garcia')
    contract = LaborContract.objects.get(employee=emp, is_active=True)
    rate = Decimal('349.9272')
    breakdown = SalarySplitter.get_salary_breakdown(contract, exchange_rate=rate)
    print(f'Breakdown: {breakdown}')
