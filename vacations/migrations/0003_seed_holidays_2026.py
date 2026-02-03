# -*- coding: utf-8 -*-
"""
Data migration para poblar feriados nacionales de Venezuela 2026.
"""
from django.db import migrations


def seed_holidays_2026(apps, schema_editor):
    """
    Crea los feriados nacionales de Venezuela para 2026.
    """
    Holiday = apps.get_model('vacations', 'Holiday')
    
    # Feriados 2026 Venezuela
    holidays = [
        # Año Nuevo
        ('2026-01-01', 'Año Nuevo', True, True),
        
        # Carnaval 2026 (Lunes y Martes antes de Miércoles de Ceniza)
        # Semana Santa cae en Abril, Carnaval es 46 días antes = Febrero
        ('2026-02-16', 'Lunes de Carnaval', True, False),
        ('2026-02-17', 'Martes de Carnaval', True, False),
        
        # Semana Santa 2026 (Pascua: 5 de Abril 2026)
        ('2026-04-09', 'Jueves Santo', True, False),
        ('2026-04-10', 'Viernes Santo', True, False),
        
        # Declaración de Independencia
        ('2026-04-19', 'Declaración de Independencia', True, True),
        
        # Día del Trabajador
        ('2026-05-01', 'Día del Trabajador', True, True),
        
        # Batalla de Carabobo
        ('2026-06-24', 'Batalla de Carabobo', True, True),
        
        # Día de la Independencia
        ('2026-07-05', 'Día de la Independencia', True, True),
        
        # Natalicio de Bolívar
        ('2026-07-24', 'Natalicio del Libertador', True, True),
        
        # Día de la Resistencia Indígena
        ('2026-10-12', 'Día de la Resistencia Indígena', True, True),
        
        # Navidad
        ('2026-12-24', 'Nochebuena', True, True),
        ('2026-12-25', 'Navidad', True, True),
        
        # Fin de Año
        ('2026-12-31', 'Fin de Año', True, True),
    ]
    
    for date, name, is_national, is_recurring in holidays:
        Holiday.objects.update_or_create(
            date=date,
            defaults={
                'name': name,
                'is_national': is_national,
                'is_recurring': is_recurring,
            }
        )


def remove_holidays_2026(apps, schema_editor):
    """
    Reversa la migración eliminando los feriados 2026.
    """
    Holiday = apps.get_model('vacations', 'Holiday')
    Holiday.objects.filter(date__year=2026).delete()


class Migration(migrations.Migration):
    
    dependencies = [
        ('vacations', '0002_add_holiday_model'),
    ]
    
    operations = [
        migrations.RunPython(seed_holidays_2026, remove_holidays_2026),
    ]
