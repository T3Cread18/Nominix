"""
Modelo para definición de Horarios de Trabajo.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import datetime

class WorkSchedule(models.Model):
    """
    Define un horario de trabajo teórica.
    
    Ejemplo: Oficina 8-5
    - Entrada: 08:00
    - Salida: 17:00
    - Almuerzo: 12:00 - 13:00
    """
    name = models.CharField(max_length=100, verbose_name="Nombre del Horario")
    
    # Tolerancia General (minutos)
    tolerance_minutes = models.PositiveSmallIntegerField(
        default=5,
        verbose_name="Tolerancia (min)",
        help_text="Minutos de gracia antes de considerar retardo"
    )
    
    # Bloque 1: Entrada
    check_in_time = models.TimeField(
        default=datetime.time(8, 0),
        verbose_name="Hora Entrada"
    )
    
    # Bloque 2: Salida a Almuerzo
    lunch_start_time = models.TimeField(
        default=datetime.time(12, 0),
        verbose_name="Inicio Almuerzo"
    )
    
    # Bloque 3: Regreso de Almuerzo
    lunch_end_time = models.TimeField(
        default=datetime.time(13, 0),
        verbose_name="Fin Almuerzo"
    )
    
    # Bloque 4: Salida
    check_out_time = models.TimeField(
        default=datetime.time(17, 0),
        verbose_name="Hora Salida"
    )
    
    # Metadata
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Horario de Trabajo"
        verbose_name_plural = "Horarios de Trabajo"
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} ({self.check_in_time.strftime('%H:%M')} - {self.check_out_time.strftime('%H:%M')})"
    
    @property
    def expected_hours(self):
        """Calcula horas teóricas de trabajo (excluyendo almuerzo)."""
        # Simple calculation assuming same day
        start = datetime.datetime.combine(datetime.date.min, self.check_in_time)
        end = datetime.datetime.combine(datetime.date.min, self.check_out_time)
        
        lunch_start = datetime.datetime.combine(datetime.date.min, self.lunch_start_time)
        lunch_end = datetime.datetime.combine(datetime.date.min, self.lunch_end_time)
        
        total_seconds = (end - start).total_seconds()
        lunch_seconds = (lunch_end - lunch_start).total_seconds()
        
        return (total_seconds - lunch_seconds) / 3600
