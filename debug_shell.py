from django_tenants.utils import tenant_context
from customers.models import Client
from payroll_core.models import Employee
from payroll_core.serializers import EmployeeSerializer
import traceback

def test():
    try:
        tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
        with tenant_context(tenant):
            employees = Employee.objects.all()
            print(f"Found {employees.count()} employees")
            serializer = EmployeeSerializer(employees, many=True)
            data = serializer.data
            print("Successfully serialized data")
    except Exception:
        traceback.print_exc()

test()
exit()
