import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import PayrollConcept

with schema_context('grupo_farmacias_ospino'):
    concepts = PayrollConcept.objects.all()
    print("ID | CODE | NAME | BEHAVIOR | FORMULA")
    for c in concepts:
        print(f"{c.id} | {c.code} | {c.name} | {c.behavior} | {c.formula}")
