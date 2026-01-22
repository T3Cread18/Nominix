import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

def fix_db():
    with connection.cursor() as cursor:
        print("Checking for currency_id in customers_client...")
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'customers_client' AND column_name = 'currency_id'")
        if cursor.fetchone():
            print("Found currency_id. Dropping column...")
            # En PostgreSQL, esto también borrará las constraints asociadas
            cursor.execute("ALTER TABLE customers_client DROP COLUMN currency_id CASCADE")
            print("Column dropped.")
        else:
            print("currency_id not found.")

if __name__ == "__main__":
    fix_db()
