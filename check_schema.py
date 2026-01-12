from django.db import connection
from django_tenants.utils import schema_context
from customers.models import Client

def run():
    tenants = Client.objects.all()
    models_to_check = [
        ('payroll_core_payrollconcept', ['created_at', 'is_system', 'appears_on_receipt']),
        ('payroll_core_payslipdetail', ['quantity', 'unit', 'tipo_recibo']),
        ('payroll_core_payslip', ['created_at', 'exchange_rate_applied']),
    ]
    
    for t in tenants:
        print(f"\n--- Checking Schema: {t.schema_name} ---")
        with schema_context(t.schema_name):
            with connection.cursor() as cursor:
                for table, columns in models_to_check:
                    cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND table_schema = '{t.schema_name}'")
                    existing_columns = [row[0] for row in cursor.fetchall()]
                    
                    missing = [c for c in columns if c not in existing_columns]
                    if missing:
                        print(f"  [MISSING] Table {table} is missing columns: {missing}")
                    else:
                        print(f"  [OK] Table {table} has all required columns.")

if __name__ == '__main__':
    run()
