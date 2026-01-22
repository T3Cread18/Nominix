from django.db import connection

def inspect_table(table_name):
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'")
        columns = cursor.fetchall()
        print(f"Columns for {table_name}:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]})")

if __name__ == "__main__":
    inspect_table('customers_client')
