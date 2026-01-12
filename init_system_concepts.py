import django
import os
from django_tenants.utils import schema_context
from customers.models import Client
from payroll_core.services.initialization import create_system_concepts

def run():
    tenants = Client.objects.exclude(schema_name='public')
    print(f"Encontrados {tenants.count()} tenants para procesar.")
    
    for tenant in tenants:
        print(f"Procesando tenant: {tenant.schema_name}...")
        try:
            with schema_context(tenant.schema_name):
                count = create_system_concepts()
                print(f"  - Creados/actualizados {count} conceptos.")
        except Exception as e:
            print(f"  - ERROR en {tenant.schema_name}: {e}")

if __name__ == "__main__":
    run()
