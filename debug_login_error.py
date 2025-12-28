import os
import django
import sys

# Setup environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.test import Client
from customers.models import Client as Tenant
from django_tenants.utils import tenant_context

def test_login():
    try:
        tenant = Tenant.objects.get(schema_name='grupo_farmacias_ospino')
        with tenant_context(tenant):
            c = Client()
            # Try to login and see the real error if it crashes
            data = {'username': 'ingpablo', 'password': 'admin123'}
            response = c.post('/api/auth/login/', data=data, content_type='application/json', HTTP_HOST='gfo.localhost')
            print(f"Status Code: {response.status_code}")
            print(f"Content: {response.content.decode()}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_login()
