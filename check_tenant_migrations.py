
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from django_tenants.utils import schema_context

print("Identifying tenants...")
tenants = Client.objects.all()
for tenant in tenants:
    print(f"Checking Tenant: {tenant.name} ({tenant.schema_name}) Domain: {tenant.domains.first().domain}")
    try:
        with schema_context(tenant.schema_name):
            # Check if payroll_core tables exist
            with connection.cursor() as cursor:
                cursor.execute("SELECT to_regclass('payroll_core_employee');")
                result = cursor.fetchone()[0]
                if result:
                    print(f"  [OK] payroll_core_employee table exists.")
                else:
                    print(f"  [FAIL] payroll_core_employee table MISSING!")
    except Exception as e:
        print(f"  [ERROR] checking tenant {tenant.schema_name}: {e}")
