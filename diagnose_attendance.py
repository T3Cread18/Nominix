
import os
import sys
import django
from datetime import date, datetime

# Setup
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from biometrics.models import AttendanceEvent
from biometrics.services.daily_attendance import DailyAttendanceService
from payroll_core.models import Employee

def diagnose():
    schema = "grupo_farmacias_ospino"
    tenant = Client.objects.get(schema_name=schema)
    django.db.connection.set_tenant(tenant)
    
    dates_to_check = [date(2026, 1, 31), date(2026, 2, 1), date(2026, 2, 11)]
    
    for target_date in dates_to_check:
        print(f"\n--- DIAGNOSING {target_date} ---")
        
        events = AttendanceEvent.objects.filter(timestamp__date=target_date)
        print(f"Total events: {events.count()}")
        
        if events.count() == 0:
            continue
            
        summary = DailyAttendanceService.get_daily_summary(target_date)
        effective_count = len([s for s in summary if s['effective_hours'] > 0])
        print(f"Effective records (hours > 0): {effective_count}")
        
        # Show some samples
        for s in summary:
            if s['effective_hours'] > 0:
                print(f"  Emp: {s['employee']['name']} | Hours: {s['effective_hours']}")
                for name, b in s['blocks'].items():
                    print(f"    {name}: {b['status']} at {b['time']}")
                break # Just one per day
        
        # Check unmapped events for this day
        unmapped = events.filter(employee_id__isnull=True).count()
        print(f"Unmapped events: {unmapped}")

if __name__ == "__main__":
    diagnose()
