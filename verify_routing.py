import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Currency, ExchangeRate
from django.db import connection
from django_tenants.utils import schema_context

def check_routing():
    print("Testing routing for Currency and ExchangeRate models...")
    
    # Check in public schema
    with schema_context('public'):
        print(f"\n[Public Schema]")
        print(f"Currencies: {Currency.objects.count()}")
        print(f"Rates: {ExchangeRate.objects.count()}")
        for rate in ExchangeRate.objects.all():
            print(f"  - {rate.currency.code}: {rate.rate} ({rate.source})")

    # Check in tenant schema
    tenant = 'grupo_farmacias_ospino'
    with schema_context(tenant):
        print(f"\n[Tenant Schema: {tenant}]")
        print(f"Currencies: {Currency.objects.count()}")
        print(f"Rates: {ExchangeRate.objects.count()}")
        # Check if table exists locally (it should NOT if everything is correct)
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = 'payroll_core_currency'", [tenant])
            exists_old_curr = cursor.fetchone()[0]
            cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = 'payroll_core_exchangerate'", [tenant])
            exists_old_rate = cursor.fetchone()[0]
            print(f"Old local Currency table exists: {bool(exists_old_curr)}")
            print(f"Old local ExchangeRate table exists: {bool(exists_old_rate)}")

if __name__ == "__main__":
    check_routing()
