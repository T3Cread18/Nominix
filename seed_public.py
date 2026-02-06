import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

def seed_public_currencies():
    # Asegurarnos de estar en el esquema public
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")
        
        # Insertar VES si no existe
        cursor.execute("SELECT code FROM customers_currency WHERE code = 'VES'")
        if not cursor.fetchone():
            print("Seeding VES...")
            cursor.execute("INSERT INTO customers_currency (code, name, symbol, is_base_currency, is_active, decimal_places) VALUES ('VES', 'Bolívares', 'Bs.', True, True, 2)")
        
        # Insertar USD si no existe
        cursor.execute("SELECT code FROM customers_currency WHERE code = 'USD'")
        if not cursor.fetchone():
            print("Seeding USD...")
            cursor.execute("INSERT INTO customers_currency (code, name, symbol, is_base_currency, is_active, decimal_places) VALUES ('USD', 'Dólares', '$', False, True, 2)")

if __name__ == "__main__":
    seed_public_currencies()
