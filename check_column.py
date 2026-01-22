import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

with schema_context('grupo_farmacias_ospino'):
    with connection.cursor() as cursor:
        cursor.execute("SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'payroll_core_laborcontract' AND column_name = 'islr_retention_percentage'")
        res = cursor.fetchone()
        if res:
            print(f"Column: {res[0]}")
            print(f"Default: {res[1]}")
            print(f"Nullable: {res[2]}")
        else:
            print("Column not found")
