import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

def dump_columns(table_name):
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'")
        columns = cursor.fetchall()
        with open('columns_dump.txt', 'w') as f:
            f.write(f"Columns for {table_name}:\n")
            for col in columns:
                f.write(f"  - {col[0]} ({col[1]})\n")

if __name__ == "__main__":
    dump_columns('customers_client')
