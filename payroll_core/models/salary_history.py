"""
Historial de Cambios Salariales.

Registra cada modificación al salario de un empleado para:
- Recálculo retroactivo de prestaciones sociales (Art. 142 lit. d LOTTT)
- Auditoría de cambios salariales
- Reportes históricos
"""
from django.db import models
from django.utils import timezone
from decimal import Decimal

from .employee import Employee, LaborContract
from customers.models import Currency


class SalaryHistory(models.Model):
    """
    Registro inmutable de cada cambio salarial.
    
    Se crea automáticamente al modificar salary_amount en LaborContract.save().
    Permite reconstruir el salario vigente en cualquier fecha histórica.
    """
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='salary_history',
        verbose_name='Empleado'
    )
    
    contract = models.ForeignKey(
        LaborContract,
        on_delete=models.CASCADE,
        related_name='salary_changes',
        verbose_name='Contrato'
    )
    
    # Salario anterior y nuevo
    previous_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Monto Anterior',
        help_text='Salario mensual anterior (null si es el registro inicial)'
    )
    
    new_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Monto Nuevo',
        help_text='Salario mensual nuevo'
    )
    
    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        verbose_name='Moneda'
    )
    
    # Fecha desde cuando aplica este salario
    effective_date = models.DateField(
        verbose_name='Fecha de Vigencia',
        help_text='Fecha desde la cual aplica este salario'
    )
    
    # Motivo del cambio
    reason = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Motivo',
        help_text='Ej: Aumento anual, Promoción, Ajuste por inflación'
    )
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    
    created_by = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Creado por'
    )
    
    class Meta:
        verbose_name = 'Historial Salarial'
        verbose_name_plural = 'Historial Salarial'
        ordering = ['employee', '-effective_date']
        indexes = [
            models.Index(fields=['employee', '-effective_date']),
            models.Index(fields=['contract', '-effective_date']),
        ]
    
    def __str__(self):
        return f"{self.employee} | {self.effective_date}: {self.previous_amount} → {self.new_amount}"
    
    @classmethod
    def record_change(cls, contract, previous_amount=None, reason='', created_by='system'):
        """
        Registra un cambio salarial a partir de un contrato.
        
        Args:
            contract: LaborContract con el nuevo salario
            previous_amount: Monto anterior (None si es registro inicial)
            reason: Motivo del cambio
            created_by: Usuario que realizó el cambio
        """
        return cls.objects.create(
            employee=contract.employee,
            contract=contract,
            previous_amount=previous_amount,
            new_amount=contract.monthly_salary,
            currency=contract.salary_currency,
            effective_date=timezone.now().date(),
            reason=reason,
            created_by=created_by,
        )
    
    @classmethod
    def get_salary_at_date(cls, employee, target_date):
        """
        Retorna el salario vigente de un empleado en una fecha dada.
        
        Útil para el recálculo retroactivo de prestaciones sociales.
        """
        record = cls.objects.filter(
            employee=employee,
            effective_date__lte=target_date
        ).order_by('-effective_date').first()
        
        if record:
            return record.new_amount, record.currency
        
        # Fallback: usar contrato activo
        active_contract = employee.contracts.filter(is_active=True).first()
        if active_contract:
            return active_contract.monthly_salary, active_contract.salary_currency
        
        return Decimal('0.00'), None
