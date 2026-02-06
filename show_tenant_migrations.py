import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context
from django.core.management import call_command

schema = 'grupo_farmacias_ospino'
with schema_context(schema):
    print(f"Migrations for {schema}:")
    call_command('showmigrations', 'payroll_core')
