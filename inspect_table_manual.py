import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

schema = 'grupo_farmacias_ospino'
table = 'payroll_core_payrollconcept'

with schema_context(schema):
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}'")
        columns = cursor.fetchall()
        print(f"All columns for {table} in {schema}:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]})")
