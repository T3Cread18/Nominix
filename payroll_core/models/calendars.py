"""
Modelos para gestión de calendarios y feriados.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

class Holiday(models.Model):
    """
    Días Feriados y No Laborables.
    
    Permite definir los feriados nacionales (LOTTT) y feriados específicos.
    Se utiliza para:
    - Calcular días hábiles para vacaciones.
    - Calcular recargos por trabajar en feriados.
    """
    
    date = models.DateField(
        verbose_name=_('Fecha'),
        help_text=_('Fecha del feriado')
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name=_('Nombre'),
        help_text=_('Descripción del feriado (ej: Navidad)')
    )
    
    is_recurring = models.BooleanField(
        default=True,
        verbose_name=_('Recurrente'),
        help_text=_('Si es True, se repite todos los años en la misma fecha (ej: 1 de Mayo)')
    )
    
    active = models.BooleanField(
        default=True,
        verbose_name=_('Activo')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Día Feriado')
        verbose_name_plural = _('Días Feriados')
        ordering = ['date']
        indexes = [
            models.Index(fields=['date']),
        ]
        
    def __str__(self):
        return f"{self.date.strftime('%d-%m')} - {self.name}" + (" (R)" if self.is_recurring else "")
