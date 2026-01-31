import os
import django
import sys
from datetime import date
import json

# Setup Django environment
sys.path.append('c:/Desarrollo/RRHH')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client
from django_tenants.utils import tenant_context
from payroll_core.views import EmployeeVariationViewSet
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model

def test_calc_endpoint():
    # Setup Tenant
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
    
    with tenant_context(tenant):
        print("Testing calculate_end_date endpoint...")
        
        user = get_user_model().objects.first()
        if not user:
            print("No user found to authenticate.")
            # Create temp user? Using superuser from seeded db if exists.
            # Assuming there is at least one user.
            return

        factory = APIRequestFactory()
        view = EmployeeVariationViewSet.as_view({'post': 'calculate_end_date'})
        
        # Case: 1st May (Holiday)
        # Start: 2024-05-01. Days: 3.
        data = {"start_date": "2024-05-01", "days": 3}
        request = factory.post('/api/employee-variations/calculate-end-date/', data, format='json')
        force_authenticate(request, user=user)
        
        response = view(request)
        print(f"Status Code: {response.status_code}")
        print(f"Response Data: {json.dumps(response.data, default=str, indent=2)}")
        
        if response.status_code == 200:
            end_date = response.data['end_date']
            print(f"Calculated End Date: {end_date}")
            # Expected: 2024-05-06
            if str(end_date) == '2024-05-06':
                print("SUCCESS: Date match expected logic.")
            else:
                print("FAILURE: Date mismatch.")
        else:
            print("FAILURE: Request didn't return 200.")

if __name__ == "__main__":
    test_calc_endpoint()
