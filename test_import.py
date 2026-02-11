import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')

import django
django.setup()

try:
    from biometrics.services.daily_attendance import DailyAttendanceService
    print("OK: DailyAttendanceService imported")
except Exception as e:
    print(f"FAIL: {e}")

try:
    from payroll_core.models import WorkSchedule
    print("OK: WorkSchedule imported")
except Exception as e:
    print(f"FAIL WorkSchedule: {e}")

try:
    from biometrics.views import DailyAttendanceViewSet
    print("OK: DailyAttendanceViewSet imported")
except Exception as e:
    print(f"FAIL DailyAttendanceViewSet: {e}")
