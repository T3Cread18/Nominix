from django.db import connection
from django_tenants.utils import schema_context
from customers.models import Client

def run():
    tenants = Client.objects.all()
    
    # Lista de alteraciones por tabla
    alterations = [
        ('payroll_core_payrollconcept', [
            ('created_at', 'timestamp with time zone DEFAULT now()'),
            ('is_system', 'boolean NOT NULL DEFAULT false'),
            ('appears_on_receipt', 'boolean NOT NULL DEFAULT true'),
            ('show_even_if_zero', 'boolean NOT NULL DEFAULT false'),
            ('receipt_order', 'integer NOT NULL DEFAULT 0'),
        ]),
        ('payroll_core_payslipdetail', [
            ('quantity', 'numeric(12,2) NOT NULL DEFAULT 0.00'),
            ('unit', 'varchar(20) NOT NULL DEFAULT \'días\''),
            ('tipo_recibo', 'varchar(20) NOT NULL DEFAULT \'salario\''),
        ]),
        ('payroll_core_payslip', [
            ('created_at', 'timestamp with time zone DEFAULT now()'),
            ('exchange_rate_applied', 'numeric(18,6) NOT NULL DEFAULT 1.000000'),
        ]),
        ('payroll_core_laborcontract', [
            ('created_at', 'timestamp with time zone DEFAULT now()'),
            ('updated_at', 'timestamp with time zone DEFAULT now()'),
        ]),
        ('payroll_core_employee', [
            ('created_at', 'timestamp with time zone DEFAULT now()'),
            ('updated_at', 'timestamp with time zone DEFAULT now()'),
        ]),
        ('payroll_core_payrollnovelty', [
            ('created_at', 'timestamp with time zone DEFAULT now()'),
            ('updated_at', 'timestamp with time zone DEFAULT now()'),
        ]),
        ('payroll_core_department', [
            ('created_at', 'timestamp with time zone DEFAULT now()'),
            ('updated_at', 'timestamp with time zone DEFAULT now()'),
        ]),
        ('payroll_core_branch', [
            ('created_at', 'timestamp with time zone DEFAULT now()'),
            ('updated_at', 'timestamp with time zone DEFAULT now()'),
        ]),
    ]
    
    for t in tenants:
        print(f"\n--- Altering Schema: {t.schema_name} ---")
        with schema_context(t.schema_name):
            with connection.cursor() as cursor:
                for table, cols in alterations:
                    # Verificar si la tabla existe
                    cursor.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}' AND table_schema = '{t.schema_name}')")
                    if not cursor.fetchone()[0]:
                        print(f"  [SKIP] Table {table} does not exist.")
                        continue
                        
                    for col_name, col_type in cols:
                        # Verificar si la columna existe
                        cursor.execute(f"SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{col_name}' AND table_schema = '{t.schema_name}')")
                        if not cursor.fetchone()[0]:
                            try:
                                sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                                cursor.execute(sql)
                                print(f"  [ADDED] {table}.{col_name}")
                            except Exception as e:
                                print(f"  [ERROR] {table}.{col_name}: {e}")
                        else:
                            print(f"  [EXISTS] {table}.{col_name}")

if __name__ == '__main__':
    run()
