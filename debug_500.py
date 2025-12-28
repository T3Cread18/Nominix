import os
import django
import sys

# Setup django
sys.path.append('c:/Desarrollo/RRHH')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import tenant_context
from customers.models import Client
from payroll_core.models import Employee
from payroll_core.serializers import EmployeeSerializer
import traceback

def test_employees_api():
    try:
        tenant = Client.objects.get(schema_name='gfo')
        with tenant_context(tenant):
            employees = Employee.objects.all()
            print(f"Found {employees.count()} employees in tenant 'gfo'")
            serializer = EmployeeSerializer(employees, many=True)
            # Accessing data triggers serialization
            data = serializer.data
            print("Serialization successful")
            print(f"Serialized {len(data)} employees")
    except Exception as e:
        print("Error during serialization:")
        traceback.print_exc()

if __name__ == "__main__":
    test_employees_api()
