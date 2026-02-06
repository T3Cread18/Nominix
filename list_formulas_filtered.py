import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import PayrollConcept

with schema_context('grupo_farmacias_ospino'):
    concepts = PayrollConcept.objects.all()
    print("--- CONCEPTOS DETECTADOS ---")
    for c in concepts:
        n = c.name.lower()
        if 'sueldo' in n or 'base' in n or 'complemento' in n:
            print(f"[{c.code}] {c.name}")
            print(f"  Formula: {c.formula}")
            print("-" * 20)
