import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models.employee import Employee
from payroll_core.models.payroll import PayrollPeriod

schema = 'grupo_farmacias_ospino'
print(f"--- Data in {schema} ---")
try:
    with schema_context(schema):
        active_count = Employee.objects.filter(is_active=True).count()
        total_count = Employee.objects.count()
        open_periods = PayrollPeriod.objects.filter(status='OPEN').count()
        total_periods = PayrollPeriod.objects.count()
        
        print(f'Total Employees: {total_count}')
        print(f'Active Employees: {active_count}')
        print(f'Total Payroll Periods: {total_periods}')
        print(f'Open Payroll Periods (status=OPEN): {open_periods}')
        
        # List statuses of all periods
        all_statuses = [p.status for p in PayrollPeriod.objects.all()]
        print(f'All Statuses: {all_statuses}')
except Exception as e:
    print(f"Error checking schema {schema}: {e}")
