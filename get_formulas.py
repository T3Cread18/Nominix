import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import PayrollConcept

with schema_context('grupo_farmacias_ospino'):
    c = PayrollConcept.objects.filter(code='SUELDO_BASE').first()
    if c:
        print(f"CODE: {c.code}")
        print(f"FORMULA: {c.formula}")
    
    c2 = PayrollConcept.objects.filter(code='COMPLEMENTO').first()
    if c2:
        print(f"CODE: {c2.code}")
        print(f"FORMULA: {c2.formula}")
    elif c2 is None:
        # Search by name if code differs
        print("COMPLEMENTO not found by code, searching by name...")
        for cp in PayrollConcept.objects.filter(name__icontains='complemento'):
            print(f"FOUND: {cp.code} - {cp.name}")
            print(f"FORMULA: {cp.formula}")
