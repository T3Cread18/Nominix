"""Test SalarySplitter isolation."""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import tenant_context
from customers.models import Client

tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')

with tenant_context(tenant):
    from payroll_core.models import Employee, ExchangeRate
    from payroll_core.services.salary import SalarySplitter
    from decimal import Decimal
    from django.utils import timezone

    emp = Employee.objects.get(national_id__icontains='30219916')
    contract = emp.contracts.filter(is_active=True).first()
    
    print(f"Contract ID: {contract.id}")
    print(f"Salary Currency: {contract.salary_currency}")
    
    rate = Decimal('1.0')
    if contract.salary_currency.code != 'VES':
         rate_obj = ExchangeRate.objects.filter(
             currency=contract.salary_currency,
             date_valid__lte=timezone.now().date()
         ).order_by('-date_valid').first()
         if rate_obj:
             rate = rate_obj.rate
    
    print(f"Rate: {rate}")
    
    try:
        breakdown = SalarySplitter.get_salary_breakdown(contract, exchange_rate=rate)
        print(f"SUCCESS: {breakdown}")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
