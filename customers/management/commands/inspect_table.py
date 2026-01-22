from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Inspects table columns in a specific schema'

    def add_arguments(self, parser):
        parser.add_argument('table_name', type=str)
        parser.add_argument('--schema', type=str, default='public')

    def handle(self, *args, **options):
        table_name = options['table_name']
        schema = options['schema']
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {schema}")
            cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'")
            columns = cursor.fetchall()
            self.stdout.write(self.style.SUCCESS(f"Columns for {table_name} in schema {schema}:"))
            for col in columns:
                self.stdout.write(f"  - {col[0]} ({col[1]})")
