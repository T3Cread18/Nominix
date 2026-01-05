from django.db import transaction
from payroll_core.models import Employee, Department

# 1. Get unique department names from existing employees
departments = Employee.objects.values_list('department', flat=True).distinct()

print(f"Found {len(departments)} unique department names.")

with transaction.atomic():
    for dept_name in departments:
        if not dept_name:
            continue
            
        print(f"Processing '{dept_name}'...")
        # Create or Get Department
        dept_obj, created = Department.objects.get_or_create(name=dept_name)
        
        # Update Employees
        count = Employee.objects.filter(department=dept_name).update(department_link=dept_obj)
        print(f"  -> {count} employees linked to '{dept_name}'")

print("Migration completed.")
