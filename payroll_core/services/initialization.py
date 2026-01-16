from django.db import transaction
from decimal import Decimal
from ..models import PayrollConcept, Currency

def create_system_concepts():
    """
    Crea los conceptos básicos de ley y sistema para el tenant actual,
    integrando la lógica detallada de Venezuela (LOTTT).
    """
    # Moneda principal (VES por defecto en Vzla)
    ves, _ = Currency.objects.get_or_create(code='VES', defaults={'name': 'Bolívares', 'symbol': 'Bs.'})
    
    system_concepts = [
        # === ASIGNACIONES ===
        {
            'code': 'SUELDO_BASE',
            'name': 'Sueldo Base',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.SALARY_BASE,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'ISLR_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 10,
            'appears_on_receipt': True,
        },
        {
            'code': 'DIAS_DESCANSO',
            'name': 'Días de Descanso',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'formula': 'SALARIO_DIARIO * DIAS_SABADO * FACTOR_DESCANSO',
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.FIXED,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 11,
            'appears_on_receipt': True,
        },
        {
            'code': 'DIAS_DOMINGO',
            'name': 'Días Domingo',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'formula': 'SALARIO_DIARIO * DIAS_DOMINGO * FACTOR_DESCANSO',
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.FIXED,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 12,
            'appears_on_receipt': True,
        },
        {
            'code': 'DIAS_FERIADO',
            'name': 'Días Feriados',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'formula': 'SALARIO_DIARIO * DIAS_FERIADO * FACTOR_FERIADO',
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.FIXED,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 13,
            'appears_on_receipt': True,
        },
        
        # --- HORAS EXTRAS Y RECARGOS ---
        {
            'code': 'H_EXTRA_DIURNA',
            'name': 'Horas Extras Diurnas',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'formula': '(SALARIO_DIARIO / 8) * H_EXTRA_DIURNA * FACTOR_HED',
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.DYNAMIC,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 20,
            'appears_on_receipt': True,
        },
        {
            'code': 'H_EXTRA_NOCTURNA',
            'name': 'Horas Extras Nocturnas',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'formula': '(SALARIO_DIARIO / 8) * H_EXTRA_NOCTURNA * FACTOR_HEN',
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.DYNAMIC,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 21,
            'appears_on_receipt': True,
        },
        {
            'code': 'BONO_NOCTURNO',
            'name': 'Bono Nocturno',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'formula': '(SALARIO_DIARIO / 8) * BONO_NOCTURNO * TASA_BONO_NOCTURNO',
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.DYNAMIC,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 22,
            'appears_on_receipt': True,
        },

        {
            'code': 'BONIFICACION',
            'name': 'Bonificación Especial',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.DYNAMIC,
            'receipt_order': 40,
            'appears_on_receipt': True,
        },
        {
            'code': 'COMPLEMENTO',
            'name': 'Complemento Salarial',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.COMPLEMENT,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'receipt_order': 45,
            'appears_on_receipt': True,
        },
        {
            'code': 'CESTATICKET',
            'name': 'Cestaticket',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': Decimal('0.00'),
            'is_salary_incidence': False,
            'behavior': PayrollConcept.ConceptBehavior.CESTATICKET,
            'receipt_order': 50,
            'appears_on_receipt': True,
        },
        
        # === DEDUCCIONES DE LEY ===
        {
            'code': 'IVSS',
            'name': 'Seguro Social Obligatorio (IVSS)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': Decimal('4.00'),
            'behavior': PayrollConcept.ConceptBehavior.LAW_DEDUCTION,
            'system_params': {
                'rate': 0.04,
                'base_source': 'ACCUMULATOR',
                'base_label': 'IVSS_BASE',
                'cap_multiplier': 5,
                'multiplier_var': 'LUNES',
                'is_weekly': True,
            },
            'receipt_order': 100,
            'appears_on_receipt': True,
            'show_even_if_zero': True,
        },
        {
            'code': 'RPE',
            'name': 'Régimen Prestacional de Empleo (Paro Forzoso)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': Decimal('0.50'),
            'behavior': PayrollConcept.ConceptBehavior.LAW_DEDUCTION,
            'system_params': {
                'rate': 0.005,
                'base_source': 'ACCUMULATOR',
                'base_label': 'RPE_BASE',
                'cap_multiplier': 10,
                'multiplier_var': 'LUNES',
                'is_weekly': True,
            },
            'receipt_order': 101,
            'appears_on_receipt': True,
            'show_even_if_zero': True,
        },
        {
            'code': 'FAOV',
            'name': 'Fondo de Ahorro Obligatorio para Vivienda (FAOV)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': Decimal('1.00'),
            'behavior': PayrollConcept.ConceptBehavior.LAW_DEDUCTION,
            'system_params': {
                'rate': 0.01,
                'base_source': 'ACCUMULATOR',
                'base_label': 'FAOV_BASE',
                'cap_multiplier': None,
                'multiplier_var': None,
                'is_weekly': False,
            },
            'receipt_order': 102,
            'appears_on_receipt': True,
            'show_even_if_zero': True,
        },
        {
            'code': 'ISLR',
            'name': 'I.S.L.R.',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'behavior': PayrollConcept.ConceptBehavior.DYNAMIC,
            'receipt_order': 110,
            'appears_on_receipt': True,
        },
        {
            'code': 'INCES',
            'name': 'INCES (0.5%)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'behavior': PayrollConcept.ConceptBehavior.DYNAMIC,
            'receipt_order': 120,
            'appears_on_receipt': True,
        },
        {
            'code': 'PRESTAMO',
            'name': 'Préstamo / Anticipo',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': Decimal('0.00'),
            'behavior': PayrollConcept.ConceptBehavior.LOAN,
            'receipt_order': 130,
            'appears_on_receipt': True,
        },
    ]

    with transaction.atomic():
        for data in system_concepts:
            code = data.pop('code')
            # Extraer incidences y system_params si existen
            incidences = data.pop('incidences', [])
            system_params = data.pop('system_params', {})
            
            PayrollConcept.objects.update_or_create(
                code=code,
                defaults={
                    **data,
                    'currency': ves,
                    'is_system': True,
                    'calculation_base': data.get('calculation_base', PayrollConcept.CalculationBase.TOTAL),
                    'incidences': incidences,
                    'system_params': system_params,
                    'active': True
                }
            )
            
        # Limpieza de códigos antiguos/obsoletos
        PayrollConcept.objects.filter(code='DIAS_FERIADOS').delete()

    return len(system_concepts)
