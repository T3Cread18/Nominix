import os
import django
import sys

# Setup environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.test import Client
from customers.models import Client as Tenant
from django_tenants.utils import tenant_context

def test_employees():
    try:
        tenant = Tenant.objects.get(schema_name='grupo_farmacias_ospino')
        with tenant_context(tenant):
            c = Client()
            response = c.get('/api/employees/', HTTP_HOST='gfo.localhost')
            print(f"Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"Content: {response.content.decode()}")
            else:
                print("Employees listing SUCCESSFUL")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_employees()
