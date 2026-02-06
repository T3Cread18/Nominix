import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

import traceback
from django_tenants.utils import schema_context
from payroll_core.models import LaborContract, Employee
from payroll_core.serializers import LaborContractSerializer
from customers.models import Currency
from datetime import date

with schema_context('grupo_farmacias_ospino'):
    emp = Employee.objects.first()
    
    data = {
        'employee': emp.id,
        'contract_type': 'INDEFINITE',
        'salary_amount': 600,
        'base_salary_bs': 130,
        'salary_currency': 'USD',
        'payment_frequency': 'BIWEEKLY',
        'start_date': '2026-01-01',
        'is_active': True,
    }
    
    serializer = LaborContractSerializer(data=data)
    print("Validated data:", serializer.initial_data)
    
    if serializer.is_valid():
        print("Validated!")
        print("Validated data after:", serializer.validated_data)
        try:
            contract = serializer.save()
            print(f'Contrato creado: {contract.id}')
        except Exception as e:
            print('=== FULL ERROR ===')
            print(str(e))
            print('=== TRACEBACK ===')
            traceback.print_exc()
    else:
        print(f'Errores: {serializer.errors}')
