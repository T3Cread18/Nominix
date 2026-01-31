import os
import django
import sys

# Setup Django environment
sys.path.append('c:/Desarrollo/RRHH')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

print("Attempting to import payroll_core.urls...")
try:
    from payroll_core import urls
    print("Success: payroll_core.urls imported.")
except Exception as e:
    import traceback
    traceback.print_exc()
