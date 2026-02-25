from django.db import models
from .organization import Branch
from .employee import Employee

class EndowmentEvent(models.Model):
    """
    Registro Histórico de Dotaciones Masivas.
    """
    date = models.DateField(
        verbose_name='Fecha de Dotación',
        help_text='Fecha en la que se entregó la dotación'
    )
    
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='endowment_events',
        verbose_name='Sede',
        help_text='Sede a la que fue dirigida la dotación (Opcional)'
    )
    
    description = models.CharField(
        max_length=255,
        verbose_name='Descripción',
        help_text='Breve descripción de la dotación (Ej: Uniformes Q1 2026)'
    )
    
    employees = models.ManyToManyField(
        Employee,
        related_name='endowments',
        verbose_name='Empleados',
        help_text='Empleados que recibieron la dotación'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Registro'
    )
    
    class Meta:
        verbose_name = 'Evento de Dotación'
        verbose_name_plural = 'Historial de Dotaciones'
        ordering = ['-date', '-created_at']
        
    def __str__(self):
        branch_name = f" - {self.branch.name}" if self.branch else " - General"
        return f"{self.date} | {self.description}{branch_name}"
