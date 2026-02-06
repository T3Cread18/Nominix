import os
import django
from django.core.management import call_command
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

with open('full_migration_error.txt', 'w') as f:
    sys.stdout = f
    sys.stderr = f
    try:
        call_command('migrate_schemas')
    except Exception:
        import traceback
        traceback.print_exc()
