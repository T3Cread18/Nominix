
import os
import sys
import django
from datetime import timedelta

# Setup
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from biometrics.models import AttendanceEvent, BiometricDevice

def fix_data():
    schema = "grupo_farmacias_ospino"
    tenant = Client.objects.get(schema_name=schema)
    django.db.connection.set_tenant(tenant)
    
    events = AttendanceEvent.objects.filter(device__timezone='UTC')
    count = 0
    for e in events:
        raw_time_str = e.raw_data.get('time', '')
        if 'T' in raw_time_str:
            try:
                # raw_time_str is like "2026-02-11T12:37:48"
                # e.timestamp is like 2026-02-11 16:37:48+00:00
                raw_part = raw_time_str.split('T')[1]
                raw_hour = int(raw_part.split(':')[0])
                
                # En UTC, la hora guardada es 16. La raw era 12.
                # Desfase = 4 horas.
                if e.timestamp.hour == raw_hour + 4:
                    e.timestamp = e.timestamp - timedelta(hours=4)
                    e.save()
                    count += 1
                elif e.timestamp.hour == (raw_hour + 4) % 24: # Caso cambio de día
                     e.timestamp = e.timestamp - timedelta(hours=4)
                     e.save()
                     count += 1
                
                if count % 100 == 0 and count > 0:
                    print(f"Corrected {count} events...")
            except Exception as ex:
                print(f"Error shift event {e.id}: {ex}")
    
    print(f"Total corrected events: {count}")

if __name__ == "__main__":
    fix_data()
