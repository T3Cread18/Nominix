import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import PayrollConcept
import sys

with schema_context('grupo_farmacias_ospino'):
    concepts = PayrollConcept.objects.all()
    for c in concepts:
        # Check simple match
        print(f"[{c.code}] {c.name}", flush=True)
        print(f"  Formula: {c.formula}", flush=True)
