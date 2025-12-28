import os
import django
from django.test import Client as TestClient
from django_tenants.utils import tenant_context
from customers.models import Client
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

def final_check():
    tc = TestClient()
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
    with tenant_context(tenant):
        print("Final success check...")
        response = tc.post('/api/auth/login/', 
                           data=json.dumps({'username': 'ingpablo', 'password': 'admin123'}),
                           content_type='application/json',
                           HTTP_HOST='gfo.localhost')
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("LOGIN SUCCESS: Integration test passed.")
        else:
            print(f"LOGIN FAILED. Status: {response.status_code}")
            print(response.content.decode())

final_check()
exit()
