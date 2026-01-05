import os
import sys
import django

# Add project root to path
sys.path.append(os.getcwd())

# Set settings environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

# Create tenant context if needed - assuming 'public' for now or iterating tenants
from django_tenants.utils import schema_context
from customers.models import Client

# Execute the script passed as argument
script_path = sys.argv[1]

# We need to run this for each tenant basically, or just specific ones
# For this MVP/fix, let's run for all tenants
tenants = Client.objects.all()

for tenant in tenants:
    print(f"--- Running for tenant: {tenant.schema_name} ---")
    with schema_context(tenant.schema_name):
        with open(script_path) as f:
            exec(f.read())
