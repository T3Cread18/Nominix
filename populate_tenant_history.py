import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "rrhh_saas.settings")
django.setup()

from customers.models import Client
from django.db import connection
from django.core.management import call_command

try:
    tenants = Client.objects.exclude(schema_name='public')
    for tenant in tenants:
        print(f"\n--- Populating history for tenant: {tenant.schema_name} ---")
        connection.set_tenant(tenant)
        try:
            call_command('populate_history', auto=True, stdout=None)
            print(f"Success for {tenant.schema_name}")
        except Exception as e:
            print(f"Error populating for {tenant.schema_name}: {e}")

except Exception as ex:
    import traceback
    traceback.print_exc()
