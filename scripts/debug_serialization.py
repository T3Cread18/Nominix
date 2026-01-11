import os
import django
import sys

# Setup environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from customers.models import Client as Tenant
from django_tenants.utils import tenant_context
from payroll_core.models import Currency, PayrollConcept
from payroll_core.serializers import CurrencySerializer, PayrollConceptSerializer

def test_serialization():
    try:
        tenant = Tenant.objects.get(schema_name='grupo_farmacias_ospino')
        with tenant_context(tenant):
            # Test Currency serialization
            curr = Currency.objects.first()
            if curr:
                ser = CurrencySerializer(curr)
                print(f"Currency Data: {ser.data}")
            
            # Test Concept serialization (which uses Currency)
            concept = PayrollConcept.objects.first()
            if concept:
                ser = PayrollConceptSerializer(concept)
                print(f"Concept Data: {ser.data}")
                
            print("Serialization test PASSED")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_serialization()
