from django.core.management.base import BaseCommand
from payroll_core.models import Holiday
from datetime import date

class Command(BaseCommand):
    help = 'Carga los días feriados de Venezuela (LOTTT)'

    def handle(self, *args, **options):
        # Feriados Fijos (Recurrentes)
        fixed_holidays = [
            (1, 1, 'Año Nuevo'),
            (4, 19, 'Declaración de la Independencia'),
            (5, 1, 'Día del Trabajador'),
            (6, 24, 'Batalla de Carabobo'),
            (7, 5, 'Día de la Independencia'),
            (7, 24, 'Natalicio de Bolívar'),
            (10, 12, 'Día de la Resistencia Indígena'),
            (12, 24, 'Víspera de Navidad'),
            (12, 25, 'Navidad'),
            (12, 31, 'Fin de Año'),
        ]

        created_count = 0
        for month, day, name in fixed_holidays:
            # Usamos un año bisiesto ficticio (2000) para permitir 29 de feb si existiera
            # Al ser recurrente=True, el año no importa tanto, pero usaremos 2024 como base
            d = date(2024, month, day)
            obj, created = Holiday.objects.get_or_create(
                date=d,
                defaults={
                    'name': name,
                    'is_recurring': True,
                    'active': True
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Creado: {name}'))

        # Feriados Móviles (Ejemplo 2025)
        # Carnaval 2025
        floating_holidays_2025 = [
            (date(2025, 3, 3), 'Lunes de Carnaval'),
            (date(2025, 3, 4), 'Martes de Carnaval'),
            (date(2025, 4, 17), 'Jueves Santo'),
            (date(2025, 4, 18), 'Viernes Santo'),
        ]

        for d, name in floating_holidays_2025:
            obj, created = Holiday.objects.get_or_create(
                date=d,
                defaults={
                    'name': name,
                    'is_recurring': False,
                    'active': True
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Creado: {name} ({d.year})'))

        self.stdout.write(self.style.SUCCESS(f'Proceso completado. {created_count} feriados creados.'))
