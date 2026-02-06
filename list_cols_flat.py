import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

with schema_context('grupo_farmacias_ospino'):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT ordinal_position, column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'payroll_core_laborcontract'
            AND table_schema = 'grupo_farmacias_ospino'
            AND ordinal_position BETWEEN 10 AND 21
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        for col in columns:
            print(f"{col[0]}|{col[1]}|{col[2]}", flush=True)
