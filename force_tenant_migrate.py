
import os
import django
import traceback
from django.core.management import call_command
from django_tenants.utils import schema_context, get_tenant_model

try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
    django.setup()

    TenantModel = get_tenant_model()

    # Identify tenant
    domain = "gfo.localhost"
    # Or find by name if domain match fails
    tenant = TenantModel.objects.filter(domains__domain=domain).first()

    if not tenant:
        print(f"Tenant for domain {domain} not found. Searching all...")
        for t in TenantModel.objects.all():
            print(f"Found: {t.name} ({t.schema_name})")
            if t.schema_name not in ['public']:
                 tenant = t
                 break

    if tenant:
        print(f"Migrating schema: {tenant.schema_name}")
        try:
            with schema_context(tenant.schema_name):
                print("Resetting payroll_core migrations to zero...")
                try:
                    call_command('migrate', 'payroll_core', 'zero', interactive=False)
                except Exception as e:
                    print(f"Zero migration warning (continuing): {e}")
                
                print("Running migration for payroll_core...")
                call_command('migrate', 'payroll_core', interactive=False)
                print("Migration complete!")
        except Exception as e:
            print(f"Migration failed: {e}")
            traceback.print_exc()
    else:
        print("No tenant found.")

except Exception as e:
    print(f"Script Error: {e}")
    traceback.print_exc()
