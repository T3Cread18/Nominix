import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

schema = 'grupo_farmacias_ospino'
table = 'payroll_core_payrollconcept'

def repair_db():
    with schema_context(schema):
        with connection.cursor() as cursor:
            # Check if columns exist
            cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}'")
            existing_cols = [c[0] for c in cursor.fetchall()]
            
            print(f"Repairing {table} in {schema}...")
            
            if 'system_params' not in existing_cols:
                print("Adding missing column 'system_params'...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN system_params jsonb DEFAULT '{{}}'::jsonb")
            else:
                print("'system_params' already exists.")

            if 'behavior' not in existing_cols:
                print("Adding missing column 'behavior'...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN behavior varchar(20) DEFAULT 'DYNAMIC'")
            else:
                print("'behavior' already exists.")

            # Fix duplication if any (unlikely but better to check)
            # Actually, information_schema might show duplicates if there's a weird join issue in our debug script
            
            print("Finished repair.")

if __name__ == "__main__":
    repair_db()
