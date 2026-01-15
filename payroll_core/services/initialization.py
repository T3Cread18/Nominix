"""
Servicio para la inicialización de datos maestros en nuevos tenants.
"""
from django.db import transaction
from ..models import PayrollConcept, Currency

def create_system_concepts():
    """
    Crea los conceptos básicos de ley y sistema para el tenant actual.
    """
    # Moneda principal (VES por defecto en Vzla)
    ves, _ = Currency.objects.get_or_create(code='VES', defaults={'name': 'Bolívares', 'symbol': 'Bs.'})
    
    system_concepts = [
        # ASIGNACIONES
        {
            'code': 'SUELDO_BASE',
            'name': 'Días Trabajados',
            'kind': 'EARNING',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 10,
            'show_even_if_zero': True,
            'is_system': True,
        },
        {
            'code': 'DIAS_DESCANSO',
            'name': 'Días Descanso Trabajados',
            'kind': 'EARNING',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 20,
            'show_even_if_zero': True,
            'is_system': True,
        },
        {
            'code': 'DIAS_FERIADOS',
            'name': 'Días Feriados',
            'kind': 'EARNING',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 30,
            'show_even_if_zero': True,
            'is_system': True,
        },
        {
            'code': 'BONIFICACION',
            'name': 'Bonificación Especial',
            'kind': 'EARNING',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 40,
            'is_system': True,
        },
        {
            'code': 'CESTATICKET',
            'name': 'Cestaticket Socialista',
            'kind': 'EARNING',
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'receipt_order': 100,
            'is_salary_incidence': False,
            'is_system': True,
        },
        {
            'code': 'COMPLEMENTO',
            'name': 'Complemento de Salario',
            'kind': 'EARNING',
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'receipt_order': 110,
            'is_salary_incidence': False,
            'is_system': True,
        },
        
        # DEDUCCIONES
        {
            'code': 'IVSS',
            'name': 'S.S.O. (IVSS)',
            'kind': 'DEDUCTION',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 200,
            'show_even_if_zero': True,
            'is_system': True,
        },
        {
            'code': 'RPE',
            'name': 'Paro Forzoso (R.P.E.)',
            'kind': 'DEDUCTION',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 210,
            'show_even_if_zero': True,
            'is_system': True,
        },
        {
            'code': 'FAOV',
            'name': 'F.A.O.V.',
            'kind': 'DEDUCTION',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 220,
            'show_even_if_zero': True,
            'is_system': True,
        },
        {
            'code': 'ISLR',
            'name': 'I.S.L.R.',
            'kind': 'DEDUCTION',
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'receipt_order': 230,
            'is_system': True,
        },
        {
            'code': 'INCES',
            'name': 'INCES (0.5%)',
            'kind': 'DEDUCTION',
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'receipt_order': 240,
            'show_even_if_zero': False,
        },
    ]

    from decimal import Decimal
    with transaction.atomic():
        for data in system_concepts:
            code = data.pop('code')
            PayrollConcept.objects.update_or_create(
                code=code,
                defaults={
                    **data,
                    'value': Decimal('0.00'),
                    'currency': ves,
                    'is_system': True,
                    'appears_on_receipt': True,
                    'active': True
                }
            )
    return len(system_concepts)
