"""
Modelos para gestión de Vacaciones.

VacationBalance: Saldo de días de vacaciones por empleado y año de servicio.
"""
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .employee import Employee, LaborContract


class VacationBalance(models.Model):
    """
    Saldo de días de vacaciones por empleado y año de servicio.
    
    Según la LOTTT venezolana:
    - Después de 1 año de servicio: 15 días hábiles + 1 día por año adicional (máx 30)
    - Bono vacacional: 15 días de salario + 1 día por año adicional (máx 30)
    
    Este modelo permite:
    - Trackear días de vacaciones ganados por año de servicio
    - Registrar días consumidos (disfrutados)
    - Auditar pagos de bono vacacional
    """
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='vacation_balances',
        verbose_name=_('Empleado')
    )
    
    contract = models.ForeignKey(
        LaborContract,
        on_delete=models.CASCADE,
        related_name='vacation_balances',
        verbose_name=_('Contrato'),
        help_text=_('Contrato asociado al periodo vacacional')
    )
    
    # Año de servicio (1 = primer año, 2 = segundo, etc.)
    service_year = models.PositiveSmallIntegerField(
        verbose_name=_('Año de Servicio'),
        help_text=_('Número del año de servicio (1, 2, 3...)')
    )
    
    # Periodo del año de servicio
    period_start = models.DateField(
        verbose_name=_('Inicio del Período'),
        help_text=_('Fecha de inicio del año de servicio')
    )
    
    period_end = models.DateField(
        verbose_name=_('Fin del Período'),
        help_text=_('Fecha de fin del año de servicio')
    )
    
    # Derechos adquiridos
    entitled_vacation_days = models.PositiveSmallIntegerField(
        verbose_name=_('Días de Vacaciones'),
        help_text=_('Días de disfrute correspondientes a este año de servicio')
    )
    
    entitled_bonus_days = models.PositiveSmallIntegerField(
        verbose_name=_('Días de Bono Vacacional'),
        help_text=_('Días de bono vacacional correspondientes a este año')
    )
    
    # Consumo
    used_vacation_days = models.PositiveSmallIntegerField(
        default=0,
        verbose_name=_('Días Disfrutados'),
        help_text=_('Días de vacaciones ya disfrutados')
    )
    
    bonus_paid = models.BooleanField(
        default=False,
        verbose_name=_('Bono Pagado'),
        help_text=_('Indica si el bono vacacional ya fue pagado')
    )
    
    bonus_paid_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('Fecha Pago Bono'),
        help_text=_('Fecha en que se pagó el bono vacacional')
    )
    
    # Notas y auditoría
    notes = models.TextField(
        blank=True,
        verbose_name=_('Notas')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Saldo de Vacaciones')
        verbose_name_plural = _('Saldos de Vacaciones')
        ordering = ['employee', '-service_year']
        unique_together = [['employee', 'service_year']]
        indexes = [
            models.Index(fields=['employee', 'service_year']),
            models.Index(fields=['contract', 'period_start']),
        ]
    
    def __str__(self):
        return f"{self.employee} - Año {self.service_year} ({self.remaining_days} días disponibles)"
    
    @property
    def remaining_days(self) -> int:
        """Días de vacaciones disponibles (pendientes de disfrute)."""
        return max(self.entitled_vacation_days - self.used_vacation_days, 0)
    
    @property
    def is_fully_consumed(self) -> bool:
        """Indica si todos los días de vacaciones fueron disfrutados."""
        return self.used_vacation_days >= self.entitled_vacation_days
    
    @property
    def is_complete(self) -> bool:
        """Indica si el registro está completo (vacaciones disfrutadas y bono pagado)."""
        return self.is_fully_consumed and self.bonus_paid
    
    def consume_days(self, days: int) -> int:
        """
        Consume días de vacaciones del saldo.
        
        Args:
            days: Número de días a consumir
            
        Returns:
            Número de días efectivamente consumidos
            
        Raises:
            ValidationError: Si no hay suficientes días disponibles
        """
        if days > self.remaining_days:
            raise ValidationError(
                f"No hay suficientes días disponibles. "
                f"Solicitados: {days}, Disponibles: {self.remaining_days}"
            )
        
        self.used_vacation_days += days
        self.save(update_fields=['used_vacation_days', 'updated_at'])
        return days
    
    def mark_bonus_paid(self, paid_date=None):
        """Marca el bono vacacional como pagado."""
        from django.utils import timezone
        self.bonus_paid = True
        self.bonus_paid_date = paid_date or timezone.now().date()
        self.save(update_fields=['bonus_paid', 'bonus_paid_date', 'updated_at'])
