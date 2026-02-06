import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

with schema_context('grupo_farmacias_ospino'):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'payroll_core_laborcontract'
            AND table_schema = 'grupo_farmacias_ospino'
            AND is_nullable = 'NO'
        """)
        columns = cursor.fetchall()
        print(f"{'Column':<30} | {'Nullable':<10} | {'Type'}")
        print("-" * 60)
        for col in columns:
            print(f"{col[0]:<30} | {col[1]:<10} | {col[2]}")
