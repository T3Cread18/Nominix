import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import VariationCause
from payroll_core.serializers import VariationCauseSerializer
from rest_framework.exceptions import ValidationError

TENANT_SCHEMA = 'grupo_farmacias_ospino' 

def test_creation():
    print("--- Testing VariationCause Creation ---")
    data = {
        "code": "TEST_VAC",
        "name": "Test Vacation",
        "category": "VACATION",
        "is_paid": False,
        "affects_salary_days": True,
        "pay_concept_code": "",  # Testing empty string
        "is_active": True
    }
    
    print(f"Data: {data}")
    
    with schema_context(TENANT_SCHEMA):
        # 1. Test via Serializer
        print("\n1. Testing Serializer Validation...")
        serializer = VariationCauseSerializer(data=data)
        if serializer.is_valid():
            print("Serializer is valid.")
            try:
                instance = serializer.save()
                print(f"Created: {instance}")
                # Clean up
                instance.delete()
                print("Deleted test instance.")
            except Exception as e:
                print(f"Error saving: {e}")
        else:
            print(f"Serializer Errors: {serializer.errors}")

if __name__ == "__main__":
    test_creation()
