
import os
import sys
import django

# Setup
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from biometrics.models import AttendanceEvent, EmployeeDeviceMapping
from payroll_core.models import Employee

def diagnose():
    schema = "grupo_farmacias_ospino"
    tenant = Client.objects.get(schema_name=schema)
    django.db.connection.set_tenant(tenant)
    
    # 1. Take some unmapped IDs
    unmapped_ids = AttendanceEvent.objects.filter(employee__isnull=True).values_list('employee_device_id', flat=True).distinct()[:10]
    print(f"Sampling unmapped IDs: {list(unmapped_ids)}")
    
    for uid in unmapped_ids:
        # Check if ID looks like CI
        clean_id = uid.strip()
        emp = Employee.objects.filter(national_id__icontains=clean_id).first()
        if emp:
            print(f"ID {uid} matches employee {emp.full_name()} (CI: {emp.national_id})")
            # Check mapping table
            mapping = EmployeeDeviceMapping.objects.filter(employee=emp).first()
            print(f"  Mapping in table? {'YES' if mapping else 'NO'}")
            if mapping:
                print(f"  Mapping device_employee_id: {mapping.device_employee_id}")
        else:
            print(f"ID {uid} does NOT match any employee national_id")

if __name__ == "__main__":
    diagnose()
