from django.db import models
from django.utils.translation import gettext_lazy as _
from .employee import Employee

class VariationCause(models.Model):
    """
    Maestro de Causas de Variación (Ausencias, Permisos, Vacaciones).
    Define el comportamiento de remuneración y afectación al salario.
    """
    class Category(models.TextChoices):
        VACATION = 'VACATION', _('Vacaciones')
        ABSENCE = 'ABSENCE', _('Ausencia / Falta')
        PERMISSION = 'PERMISSION', _('Permiso')
        MATERNITY = 'MATERNITY', _('Licencia Médica / Maternidad')
        OTHER = 'OTHER', _('Otro')

    code = models.CharField(max_length=20, primary_key=True, verbose_name=_('Código'))
    name = models.CharField(max_length=100, verbose_name=_('Nombre'))
    description = models.TextField(blank=True, verbose_name=_('Descripción'))
    
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.ABSENCE, verbose_name=_('Categoría'))
    
    is_paid = models.BooleanField(default=False, verbose_name=_('Remunerado'), help_text=_('Si es True, se genera un concepto de pago positivo.'))
    affects_salary_days = models.BooleanField(default=True, verbose_name=_('Descuenta Días Salario'), help_text=_('Si es True, reduce los días de salario base en la nómina.'))
    
    # Concepto asociado para el pago (si aplica)
    pay_concept_code = models.CharField(max_length=30, blank=True, null=True, verbose_name=_('Concepto de Pago'), help_text=_('Código del concepto que se usará para pagar esta variación (ej: VACACIONES).'))

    is_active = models.BooleanField(default=True, verbose_name=_('Activo'))

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        verbose_name = _('Causa de Variación')
        verbose_name_plural = _('Causas de Variación')


class EmployeeVariation(models.Model):
    """
    Registro transaccional de la variación (Vacaciones, Reposo, Falta) para un empleado.
    """
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='variations', verbose_name=_('Empleado'))
    cause = models.ForeignKey(VariationCause, on_delete=models.PROTECT, related_name='variations', verbose_name=_('Causa'))
    
    start_date = models.DateField(verbose_name=_('Fecha Inicio'))
    end_date = models.DateField(verbose_name=_('Fecha Fin'))
    
    # Para variaciones por horas (opcional)
    start_time = models.TimeField(blank=True, null=True, verbose_name=_('Hora Inicio'))
    end_time = models.TimeField(blank=True, null=True, verbose_name=_('Hora Fin'))
    
    notes = models.TextField(blank=True, verbose_name=_('Notas'))
    
    # Estado de procesamiento (si ya fue considerada en una nómina cerrada)
    # Nota: Este campo se actualizaría al cerrar el periodo de nómina
    last_processed_date = models.DateTimeField(null=True, blank=True, verbose_name=_('Procesado el'))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def duration_days(self):
        """Calcula la duración en días (inclusive)."""
        return (self.end_date - self.start_date).days + 1

    def __str__(self):
        return f"{self.employee} - {self.cause.name} ({self.start_date} al {self.end_date})"

    class Meta:
        verbose_name = _('Variación de Empleado')
        verbose_name_plural = _('Variaciones de Empleado')
        ordering = ['-start_date']
