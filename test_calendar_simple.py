import os
import django
import sys
from datetime import date

# Setup Django environment
sys.path.append('c:/Desarrollo/RRHH')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from django_tenants.utils import tenant_context
from payroll_core.models import Holiday

def test_simple():
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
    with tenant_context(tenant):
        print(f"Testing Holidays in {tenant.schema_name}")
        holidays_qs = Holiday.objects.filter(active=True)
        print(f"Count: {holidays_qs.count()}")
        
        for h in holidays_qs:
             print(f"- {h.date} {h.name} (R={h.is_recurring})")
             
if __name__ == "__main__":
    test_simple()
