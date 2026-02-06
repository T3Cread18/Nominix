from django.core.management.base import BaseCommand
from django.db import connection
from customers.models import Currency

class Command(BaseCommand):
    help = 'Seeds initial monetary data (Currencies) into the PUBLIC schema'

    def handle(self, *args, **options):
        # Asegurarnos de estar en el esquema public (aunque los SharedApps ya operan ahí)
        # Pero por seguridad en comandos manuales:
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO public")

        currencies = [
            {
                'code': 'VES',
                'name': 'Bolívares',
                'symbol': 'Bs.',
                'is_base_currency': True,
                'decimal_places': 2
            },
            {
                'code': 'USD',
                'name': 'Dólares',
                'symbol': '$',
                'is_base_currency': False,
                'decimal_places': 2
            },
            {
                'code': 'EUR',
                'name': 'Euros',
                'symbol': '€',
                'is_base_currency': False,
                'decimal_places': 2
            }
        ]

        self.stdout.write("Seeding currencies into public schema...")
        for curr_data in currencies:
            curr, created = Currency.objects.get_or_create(
                code=curr_data['code'],
                defaults={
                    'name': curr_data['name'],
                    'symbol': curr_data['symbol'],
                    'is_base_currency': curr_data['is_base_currency'],
                    'decimal_places': curr_data['decimal_places'],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created currency: {curr.code}"))
            else:
                self.stdout.write(f"Currency {curr.code} already exists.")
        
        self.stdout.write(self.style.SUCCESS("Public monetary data seeding completed."))
