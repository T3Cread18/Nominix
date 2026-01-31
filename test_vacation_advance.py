"""Test generation of vacation advance payment."""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import tenant_context
from customers.models import Client

try:
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
except Client.DoesNotExist:
    print("Tenant not found")
    exit(1)

with tenant_context(tenant):
    from payroll_core.models import Employee, VacationBalance, Loan
    from payroll_core.services.vacation_advance import VacationAdvanceService
    
    # 1. Find Scarlys
    emp = Employee.objects.get(national_id__icontains='30219916')
    print(f'Employee: {emp.full_name}')
    
    # 2. Get or create balance
    balance = VacationBalance.objects.filter(employee=emp).first()
    if not balance:
        print("No vacation balance found")
        exit(1)
    
    print(f'Balance: {balance.entitled_vacation_days} days, Bonus Paid: {balance.bonus_paid}', flush=True)
    if balance.contract:
        print(f"Contract ID: {balance.contract.id}")
    
    # 3. Clean up previous test data if any
    Loan.objects.filter(
        employee=emp, 
        loan_type=Loan.LoanType.VACATION_ADVANCE
    ).delete()
    
    # Also clean up receipts for this employee (for test isolation)
    # WARNING: In prod this might be dangerous if not handled
    from payroll_core.models import PayrollReceipt
    PayrollReceipt.objects.filter(employee=emp).delete()
    
    # Reset bonus paid status for test
    balance.bonus_paid = False
    balance.save()
    
    # 4. Generate Advance
    print('\n=== GENERATING ADVANCE ===', flush=True)
    try:
        result = VacationAdvanceService.generate_advance_payment(balance)
        receipt = result['receipt']
        loan = result['loan']
        total = result['total_amount']
        
        print(f'SUCCESS! Total: {total} VES', flush=True)
        print(f'Receipt ID: {receipt.id}', flush=True)
        print(f'Loan ID: {loan.id} - Type: {loan.loan_type}', flush=True)
        print(f'Loan Balance: {loan.balance}', flush=True)
        
        # Verify receipt lines
        print('\n=== RECEIPT LINES ===', flush=True)
        for line in receipt.lines.all():
            print(f"  {line.concept_code}: {line.amount_ves} (Qty: {line.quantity}) kind={line.kind} tipo={line.tipo_recibo}", flush=True)
            
    except Exception as e:
        import traceback
        print(f'ERROR: {e}', flush=True)
        traceback.print_exc()
