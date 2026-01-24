import os
import django
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, Employee, Company, PayrollConcept
from payroll_core.services.salary import SalarySplitter
from payroll_core.engine import PayrollEngine
from decimal import Decimal

def log(msg):
    print(msg, flush=True)

with schema_context('grupo_farmacias_ospino'):
    emp = Employee.objects.get(first_name='Lorena Katiuska', last_name='Barrios Garcia')
    contract = LaborContract.objects.get(employee=emp, is_active=True)
    
    log(f"Contract: {contract.id} - Salary: {contract.salary_amount} {contract.salary_currency}")
    
    # Check SalarySplitter
    rate = Decimal('349.9272')
    log("Calling SalarySplitter...")
    breakdown = SalarySplitter.get_salary_breakdown(contract, exchange_rate=rate)
    log(f"SPLITTER RESULT: Base={breakdown['base']} | Comp={breakdown['complement']}")
    
    # Check Concepts
    log("\n--- CONCEPTS ---")
    # Removed company filter
    concepts = PayrollConcept.objects.filter(is_active=True)
    found_concepts = False
    for c in concepts:
        if 'base' in c.name.lower() or 'sueldo' in c.name.lower() or 'complemento' in c.name.lower():
            log(f"[{c.code}] {c.name}")
            log(f"  Formula: {c.formula}")
            found_concepts = True
    
    if not found_concepts:
        log("No matching concepts found!")

    # Simulate Engine Context
    log("\n--- ENGINE SIMULATION ---")
    engine = PayrollEngine(contract)
    class MockRate:
        rate = rate
    engine.exchange_rate_obj = MockRate()
    engine._cached_rate_value = rate
    
    # Build context manually to see variables
    context = engine._build_eval_context()
    log("Engine Context Variables:")
    log(f"SALARIO_MENSUAL: {context.get('SALARIO_MENSUAL')}")
    log(f"SUELDO_BASE_MENSUAL: {context.get('SUELDO_BASE_MENSUAL')}")
    log(f"SUELDO_BASE_DIARIO: {context.get('SUELDO_BASE_DIARIO')}")
