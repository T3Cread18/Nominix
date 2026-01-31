import os
import django
import sys
from datetime import date

# Setup Django environment
sys.path.append('c:/Desarrollo/RRHH')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from payroll_core.services.calendar import BusinessCalendarService
from payroll_core.models import Holiday
from customers.models import Client
from django_tenants.utils import tenant_context
from django.db import connection

def test_calendar():
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
    with tenant_context(tenant):
        print(f"--- Testing BusinessCalendarService (Tenant: {tenant.schema_name}) ---")
        print(f"Current Schema: {connection.schema_name}")
        
        print(f"Current Schema: {connection.schema_name}")
        
        # Introspection
        table_names = connection.introspection.table_names()
        hol_tables = [t for t in table_names if 'holiday' in t]
        pay_tables = [t for t in table_names if 'payroll' in t]
        
        print(f"Visible 'holiday' tables: {hol_tables}")
        print(f"Visible 'payroll' tables (first 5): {pay_tables[:5]}")
        
        if 'payroll_core_holiday' in table_names:
             print("Table 'payroll_core_holiday' EXISTS!")
        else:
             print("Table 'payroll_core_holiday' DOES NOT EXIST in this context.")

        try:
            # Try ORM query 
            count = Holiday.objects.count()
            print(f"ORM Holiday Count: {count}")
        except Exception as e:
            print(f"ORM Error: {e}")


        # Caso 1: Fin de semana estándar (Fri -> Mon)
    # Fri 12 Jul 2024 -> 2 days -> Should be Mon 15 Jul
    start = date(2024, 7, 12)
    days = 2
    end = BusinessCalendarService.add_business_days(start, days)
    print(f"Case 1 (Weekend): Start {start}, Days {days} -> End {end}")
    assert end == date(2024, 7, 15), f"Expected 2024-07-15, got {end}"

    # Caso 2: Feriado (5 Julio - Viernes)
    # Thu 4 Jul 2024 -> 2 days -> Should skip Fri 5 (Holiday) and Sat-Sun.
    # Day 1: Thu 4. Day 2: Mon 8.
    start = date(2024, 7, 4)
    days = 2
    end = BusinessCalendarService.add_business_days(start, days)
    print(f"Case 2 (Holiday 5 Jul): Start {start}, Days {days} -> End {end}")
    assert end == date(2024, 7, 8), f"Expected 2024-07-08, got {end}"
    
    # Caso 3: Contar días hábiles
    # From Thu 4 Jul to Mon 8 Jul.
    # 4 (Thu): Yes. 5 (Fri-Hol): No. 6 (Sat): No. 7 (Sun): No. 8 (Mon): Yes.
    # Total: 2.
    count = BusinessCalendarService.count_business_days(date(2024, 7, 4), date(2024, 7, 8))
    print(f"Case 3 (Count): {date(2024, 7, 4)} to {date(2024, 7, 8)} -> Count {count}")
    assert count == 2, f"Expected 2, got {count}"

    print("All tests passed!")

if __name__ == "__main__":
    test_calendar()
