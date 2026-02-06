import os
import django
import traceback
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

schema = 'grupo_farmacias_ospino'
try:
    print(f"Running migration for {schema}...")
    call_command('migrate_schemas', schema=schema, verbosity=3)
except Exception:
    traceback.print_exc()
