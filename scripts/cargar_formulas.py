from payroll_core.models import PayrollConcept, Currency

# Asegurar moneda
ves, _ = Currency.objects.get_or_create(code='VES', defaults={'is_base_currency': True})

concepts_data = [
    {
        'code': 'SUELDO_BASE',
        'name': 'Sueldo Base',
        'kind': 'EARNING',
        'computation_method': 'DYNAMIC_FORMULA',
        'formula': 'SALARIO_DIARIO * DIAS',  # <--- FÓRMULA EN TEXTO
        'currency': ves,
        'value': 0
    },
    {
        'code': 'IVSS_VE',
        'name': 'S.S.O (IVSS)',
        'kind': 'DEDUCTION',
        'computation_method': 'DYNAMIC_FORMULA',
        'formula': '(min(SALARIO_MENSUAL, SALARIO_MINIMO * 5) * 12 / 52) * LUNES * 0.04',
        'currency': ves,
        'value': 0
    },
    {
        'code': 'FAOV_VE',
        'name': 'R.P.V.H (FAOV)',
        'kind': 'DEDUCTION',
        'computation_method': 'DYNAMIC_FORMULA',
        'formula': 'SALARIO_MENSUAL * 0.01',
        'currency': ves,
        'value': 0
    },
    {
        'code': 'RPE_VE',
        'name': 'R.P.E (Paro Forzoso)',
        'kind': 'DEDUCTION',
        'computation_method': 'DYNAMIC_FORMULA',
        'formula': '(min(SALARIO_MENSUAL, SALARIO_MINIMO * 5) * 12 / 52) * LUNES * 0.005',
        'currency': ves,
        'value': 0
    },
    {
        'code': 'H_EXTRA',
        'name': 'Horas Extras Diurnas',
        'kind': 'EARNING',
        'computation_method': 'DYNAMIC_FORMULA',
        # Asume que envías input_variables={'overtime_hours': 5}
        # El engine lo convierte a mayúsculas: OVERTIME_HOURS
        'formula': '(SALARIO_DIARIO / 8) * 1.5 * OVERTIME_HOURS',
        'currency': ves,
        'value': 0
    },
    {
        'code': 'B_NOCTURNO',
        'name': 'Bono Nocturno',
        'kind': 'EARNING',
        'computation_method': 'DYNAMIC_FORMULA',
        'formula': '(SALARIO_DIARIO / 8) * 0.30 * NIGHT_HOURS',
        'currency': ves,
        'value': 0
    }
]

for data in concepts_data:
    PayrollConcept.objects.update_or_create(code=data['code'], defaults=data)
    print(f"Concepto {data['code']} actualizado con fórmula dinámica.")