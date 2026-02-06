from django.db import migrations
from decimal import Decimal
from django.utils import timezone

def create_vacation_advance_concept(apps, schema_editor):
    Currency = apps.get_model('customers', 'Currency')
    
    try:
        ves = Currency.objects.get(code='VES')
    except Currency.DoesNotExist:
        return

    # Use Raw SQL due to schema drift (tipo_recibo column exists in DB but not in historical models)
    from django.db import connection, transaction
    
    sql = """
    INSERT INTO payroll_core_payrollconcept (
        code, name, kind, computation_method, value, currency_id, 
        is_salary_incidence, active, show_on_payslip, appears_on_receipt, 
        receipt_order, behavior, created_at, 
        deducts_from_base_salary, adds_to_complement, calculation_base, 
        incidences, formula, is_system, tipo_recibo,
        show_even_if_zero, system_params, date_valid_from
    ) VALUES (
        %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s,
        %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s
    ) ON CONFLICT (code) DO NOTHING;
    """
    
    # Check if 'date_valid_from' exists? Might be too risky to guess ALL columns.
    # Better strategy: Try to utilize the fact that we can't easily guess columns.
    # Let's try to update the 'PayrollConcept' model state in the migration?
    # No, that's hard.
    
    # Backtrack: The previous error gave us the list of values submitted.
    # "Failing row contains (21, ANTICIPO_VAC, Deducción Anticipo Vacaciones, DEDUCTION, DYNAMIC_FORMULA, 0.0000, f, t, 2026-01-31 20:05:09.891851+00, VES, (SALARIO_MENSUAL / 30) * ANTICIPO_VAC_CANT, t, t, 200, f, t, ["DEDUCCION_ANTICIPO_VAC"], DYNAMIC, {}, TOTAL, f, f, null)."
    # Counting fields... 22 fields?
    # Values:
    # 1. id
    # 2. code
    # 3. name
    # 4. kind
    # 5. computation_method
    # 6. value
    # 7. is_salary_incidence (f)
    # 8. active (t)
    # 9. created_at
    # 10. currency_id (VES)
    # 11. formula
    # 12. show_on_payslip (t)
    # 13. appears_on_receipt (t)
    # 14. receipt_order (200)
    # 15. is_system (f) - Wait, I set True?
    # 16. (some boolean? deducts_from_base_salary?)
    # ...
    # Last one is null (tipo_recibo).
    
    # Simplified SQL: Specify only columns we know.
    # Postgres triggers/defaults handle the rest? 
    # created_at usually has auto_now_add=True but in SQL we must provide it or let default.
    
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO payroll_core_payrollconcept (
                code, name, kind, computation_method, value, currency_id, 
                is_salary_incidence, active, show_on_payslip, appears_on_receipt, 
                receipt_order, behavior, created_at, 
                deducts_from_base_salary, adds_to_complement, calculation_base, 
                incidences, formula, is_system, tipo_recibo,
                show_even_if_zero, system_params
            ) VALUES (
                'ANTICIPO_VAC', 'Deducción Anticipo Vacaciones', 'DEDUCTION', 'DYNAMIC_FORMULA', 0.00, %s,
                false, true, true, true,
                200, 'DYNAMIC', NOW(),
                false, false, 'TOTAL',
                '["DEDUCCION_ANTICIPO_VAC"]', '(SALARIO_MENSUAL / 30) * ANTICIPO_VAC_CANT', true, 'salario',
                false, '{}'
            )
        """, [ves.code])

def reverse_func(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM payroll_core_payrollconcept WHERE code = 'ANTICIPO_VAC'")

class Migration(migrations.Migration):

    dependencies = [
        ('payroll_core', '0046_add_vacation_config_fields'),
        ('customers', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_vacation_advance_concept, reverse_func),
    ]
