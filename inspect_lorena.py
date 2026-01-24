import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, Employee, Company

with schema_context('grupo_farmacias_ospino'):
    emp = Employee.objects.get(first_name='Lorena Katiuska', last_name='Barrios Garcia')
    contract = LaborContract.objects.get(employee=emp, is_active=True)
    company = Company.objects.first()
    jp = contract.job_position
    
    with open('/tmp/lorena_debug.log', 'w') as f:
        f.write(f"Company Split Mode: {company.salary_split_mode}\n")
        f.write(f"Contract Currency: {contract.salary_currency.code}\n")
        f.write(f"Contract Monthly Salary: {contract.monthly_salary}\n")
        if jp:
            f.write(f"JP Name: {jp.name}\n")
            f.write(f"JP Fixed Amount: {jp.split_fixed_amount}\n")
            f.write(f"JP Fixed Currency: {jp.split_fixed_currency.code if jp.split_fixed_currency else 'NONE'}\n")
        else:
            f.write("No Job Position found!\n")
