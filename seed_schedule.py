from customers.models import Client
from django_tenants.utils import schema_context
from payroll_core.models import WorkSchedule, Employee
import datetime

def run_seed():
    print("--- Seeding Default Work Schedule ---")
    
    clients = Client.objects.all()
    for client in clients:
        with schema_context(client.schema_name):
            print(f"Processing tenant: {client.schema_name}")
            
            # Create default schedule if not exists
            schedule, created = WorkSchedule.objects.get_or_create(
                name="Horario General 8-5",
                defaults={
                    'check_in_time': datetime.time(8, 0),
                    'lunch_start_time': datetime.time(12, 0),
                    'lunch_end_time': datetime.time(13, 0),
                    'check_out_time': datetime.time(17, 0),
                    'tolerance_minutes': 5
                }
            )
            
            if created:
                print(f"Created schedule: {schedule}")
            else:
                print(f"Schedule found: {schedule}")
                
            # Assign to employees without schedule
            employees = Employee.objects.filter(work_schedule__isnull=True, is_active=True)
            count = employees.update(work_schedule=schedule)
            print(f"Updated {count} employees with default schedule.")

if __name__ == '__main__':
    run_seed()
