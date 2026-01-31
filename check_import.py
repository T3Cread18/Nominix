import os
import django
import sys

# Setup Django environment
sys.path.append('c:/Desarrollo/RRHH')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

try:
    from payroll_core.models import VacationBalance
    print("Subject: VacationBalance imported successfully from payroll_core.models")
except ImportError as e:
    print(f"Error importing VacationBalance from payroll_core.models: {e}")

try:
    from payroll_core.models.vacation import VacationBalance
    print("Subject: VacationBalance imported successfully from payroll_core.models.vacation")
except ImportError as e:
    print(f"Error importing VacationBalance from payroll_core.models.vacation: {e}")

try:
    from payroll_core import admin
    print("Subject: admin module imported successfully")
except Exception as e:
    print(f"Error importing admin module: {e}")
