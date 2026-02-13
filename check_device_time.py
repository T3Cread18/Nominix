
import os
import sys
import django
from datetime import datetime

# Setup
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from biometrics.models import BiometricDevice
from biometrics.services.sync_service import BiometricSyncService

def check_time():
    schema = "grupo_farmacias_ospino"
    tenant = Client.objects.get(schema_name=schema)
    django.db.connection.set_tenant(tenant)
    
    device = BiometricDevice.objects.filter(is_active=True).first()
    if not device:
        print("No device found.")
        return
        
    client = BiometricSyncService.get_client(device)
    try:
        # Time setting
        t_resp = client._request('GET', '/ISAPI/System/Time?format=json')
        print(f"Device Time Config: {t_resp.json()}")
        
        # NTP setting
        n_resp = client._request('GET', '/ISAPI/System/NTP?format=json')
        print(f"Device NTP Config: {n_resp.json()}")
        
    except Exception as e:
        print(f"Error checking device time: {e}")

if __name__ == "__main__":
    check_time()
