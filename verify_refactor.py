from customers.models import Client
from django_tenants.utils import schema_context
from payroll_core.models import Employee, Department

for client in Client.objects.all():
    print(f"\nChecking tenant: {client.schema_name}")
    with schema_context(client.schema_name):
        employees = Employee.objects.all()
        for emp in employees:
            dept_name = emp.department.name if emp.department else "None"
            print(f" - Employee: {emp.first_name} {emp.last_name} -> Dept: {dept_name}")
            
        print(f"Total Departments: {Department.objects.count()}")
