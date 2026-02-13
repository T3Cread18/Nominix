
import os
import sys
import django

# Setup
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from biometrics.models import AttendanceEvent, EmployeeDeviceMapping, BiometricDevice
from payroll_core.models import Employee

def auto_map():
    schema = "grupo_farmacias_ospino"
    tenant = Client.objects.get(schema_name=schema)
    django.db.connection.set_tenant(tenant)
    
    # 1. Crear mapeos faltantes
    device = BiometricDevice.objects.first()
    employees = Employee.objects.filter(is_active=True)
    mappings_created = 0
    
    for emp in employees:
        # Intentar matchear national_id con employee_device_id
        # El employee_device_id puede tener o no el prefijo V-
        cedula_clean = emp.national_id.replace('V-', '').replace('E-', '').strip()
        
        # Buscar si hay eventos con ese ID
        matching_evts = AttendanceEvent.objects.filter(employee_device_id__icontains=cedula_clean, employee__isnull=True)
        if matching_evts.exists():
            # Crear mapeo si no existe
            mapping, created = EmployeeDeviceMapping.objects.get_or_create(
                employee=emp,
                device=device,
                defaults={'device_employee_id': matching_evts.first().employee_device_id}
            )
            if created:
                mappings_created += 1
            
            # Actualizar todos los eventos de ese ID
            updated = matching_evts.update(employee=emp)
            print(f"Mapped {updated} events to {emp.first_name} {emp.last_name}")

    print(f"Total new mappings: {mappings_created}")

if __name__ == "__main__":
    auto_map()
