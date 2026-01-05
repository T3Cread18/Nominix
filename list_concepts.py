import os
import django
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from payroll_core.models import PayrollConcept

def run():
    try:
        with schema_context('grupo_farmacias_ospino'):
            concepts = PayrollConcept.objects.filter(active=True)
            with open('concepts_output.txt', 'w', encoding='utf-8') as f:
                for c in concepts:
                    f.write(f"CODE: {c.code}\n")
                    f.write(f"NAME: {c.name}\n")
                    f.write(f"METHOD: {c.computation_method}\n")
                    f.write(f"FORMULA: {c.formula}\n")
                    f.write(f"VALUE: {c.value}\n")
                    f.write("-" * 20 + "\n")
            print("Successfully written to concepts_output.txt")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
