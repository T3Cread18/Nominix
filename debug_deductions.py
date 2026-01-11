
import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from payroll_core.models import Employee, Company, LaborContract, PayrollPeriod
from payroll_core.engine import PayrollEngine

from django_tenants.utils import tenant_context
from customers.models import Client

# Get first real tenant
tenant = Client.objects.exclude(schema_name='public').first()
if not tenant:
    print("No tenant found!")
    exit()

print(f"Using Tenant: {tenant.name} ({tenant.schema_name})")

with tenant_context(tenant):
    try:
        emp = Employee.objects.get(pk=1)
        contract = LaborContract.objects.filter(employee=emp, is_active=True).first()
        
        if not contract:
            print("No active contract for employee 1")
            contract = LaborContract.objects.filter(is_active=True).first()
            if contract:
                emp = contract.employee
                print(f"Found alternative employee: {emp.first_name} (ID: {emp.id})")
            else:
                exit()
        
        with open('debug_result.txt', 'w', encoding='utf-8') as f:
            f.write(f"Employee: {emp.first_name}\n")
            f.write(f"Base Salary (Contract): {contract.base_salary_bs}\n")
            f.write(f"Salary Package (Contract USD): {contract.salary_amount}\n")

            company = Company.objects.first()
            f.write(f"Company Min Salary: {company.national_minimum_salary if company else 'Default 130'}\n")

            engine = PayrollEngine(contract=contract)
            
            total_income = Decimal('18280.78')
            
            deductions = engine._get_law_deductions(total_income)
            
            f.write("\n--- Calculated Deductions ---\n")
            for d in deductions:
                f.write(f"{d['code']}: {d['amount_ves']} ({d['name']})\n")

    except Exception as e:
        print(f"Error inside tenant context: {e}")
