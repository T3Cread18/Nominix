"""Full payroll recalculation and persist for Scarlys."""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import tenant_context
from customers.models import Client

tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')

with tenant_context(tenant):
    from payroll_core.models import Employee, PayrollPeriod, PayrollReceipt
    from payroll_core.engine import PayrollEngine
    from payroll_core.services.payroll_persistence import PayrollPersistenceService
    
    emp = Employee.objects.get(national_id__icontains='30219916')
    period = PayrollPeriod.objects.order_by('-start_date').first()
    contract = emp.contracts.filter(is_active=True).first()
    
    print(f'Employee: {emp.full_name}')
    print(f'Period: {period.name}')
    
    # Delete existing receipt
    PayrollReceipt.objects.filter(employee=emp, period=period).delete()
    
    # Calculate
    print('\n=== CALCULATING ===')
    engine = PayrollEngine(contract, period)
    result = engine.calculate_payroll()
    
    # Show vacation lines
    print('\n=== VACATION LINES IN RESULT ===')
    for line in result.get('lines', []):
        if line.get('tipo_recibo') == 'vacaciones':
            print(f"  {line['code']}: {line['amount_ves']} VES")
    
    # Persist
    print('\n=== PERSISTING ===')
    receipt = PayrollPersistenceService.save_payroll_calculation(
        contract=contract,
        period=period,
        calculation_result=result
    )
    print(f'Receipt ID: {receipt.id}')
    
    # Show persisted vacation lines
    print('\n=== PERSISTED VACATION LINES ===')
    for line in receipt.lines.filter(tipo_recibo='vacaciones'):
        print(f"  {line.concept_code}: {line.amount_ves} VES")
    
    # Summary
    total_vac = sum(l.amount_ves for l in receipt.lines.filter(tipo_recibo='vacaciones'))
    print(f'\n=== TOTAL VACACIONES: {total_vac} VES ===')
