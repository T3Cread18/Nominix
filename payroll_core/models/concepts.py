"""
Modelos de conceptos de nómina (Asignaciones y Deducciones).
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

from .currency import Currency
from .employee import Employee


class PayrollConcept(models.Model):
    """
    Modelo de Concepto de Nómina.
    
    Define las reglas para asignaciones (bonos) y deducciones.
    Soporta montos fijos (en cualquier moneda) y porcentajes.
    """
    
    class ConceptKind(models.TextChoices):
        """Tipo de concepto (Asignación o Deducción)."""
        EARNING = 'EARNING', 'Asignación'
        DEDUCTION = 'DEDUCTION', 'Deducción'
    
    class ComputationMethod(models.TextChoices):
        FIXED_AMOUNT = 'FIXED_AMOUNT', 'Monto Fijo'
        PERCENTAGE_OF_BASIC = 'PERCENTAGE_OF_BASIC', 'Porcentaje del Salario Base'
        DYNAMIC_FORMULA = 'DYNAMIC_FORMULA', 'Fórmula Dinámica (Usuario)'
    
    code: models.CharField = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Código',
        help_text='Código único (ej: P001, IVSS, FAOV)'
    )
    
    name: models.CharField = models.CharField(
        max_length=100,
        verbose_name='Nombre del Concepto'
    )
    
    kind: models.CharField = models.CharField(
        max_length=20,
        choices=ConceptKind.choices,
        verbose_name='Tipo'
    )
    
    computation_method: models.CharField = models.CharField(
        max_length=30,
        choices=ComputationMethod.choices,
        default=ComputationMethod.FIXED_AMOUNT,
        verbose_name='Método de Cálculo'
    )
    
    value: models.DecimalField = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor',
        help_text='Monto fijo O porcentaje (ej: 4.00 para 4%)'
    )
    
    currency: models.ForeignKey = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        verbose_name='Moneda',
        help_text='Moneda del valor fijo (ignorado si es porcentaje)'
    )
    
    is_salary_incidence: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Incidencia Salarial',
        help_text='Indica si afecta el salario integral y prestaciones'
    )
    
    active: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )
    
    incidences = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Incidencias (Tags)',
        help_text='Lista de etiquetas de incidencia (ej: ["FAOV_BASE", "ISLR_BASE"])'
    )

    
    show_on_payslip: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Mostrar en Recibo (Legacy)',
        help_text='Si se desactiva, este concepto se calculará (si es necesario) pero no aparecerá en el recibo del empleado.'
    )
    
    appears_on_receipt: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Aparece en Recibo',
        help_text='Indica si el concepto debe ser considerado para la impresión del recibo.'
    )
    
    show_even_if_zero: models.BooleanField = models.BooleanField(
        default=False,
        verbose_name='Mostrar aunque sea Cero',
        help_text='Si es True, se imprimirá en el recibo incluso si el monto es 0.00'
    )
    
    receipt_order: models.PositiveIntegerField = models.PositiveIntegerField(
        default=0,
        verbose_name='Orden en Recibo',
        help_text='Controla la posición del concepto en el PDF (menor valor aparece primero)'
    )
    
    is_system: models.BooleanField = models.BooleanField(
        default=False,
        verbose_name='Concepto de Sistema',
        help_text='Si es True, el concepto es esencial para el motor y no puede ser modificado o eliminado.'
    )
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    formula: models.TextField = models.TextField(
        blank=True, 
        null=True, 
        verbose_name='Fórmula Python',
        help_text='Variables disponibles: SALARIO, DIAS, LUNES, TASA, ANTIGUEDAD. Ej: (SALARIO / 30) * DIAS'
    )
    
    class Meta:
        verbose_name = 'Concepto de Nómina'
        verbose_name_plural = 'Conceptos de Nómina'
        ordering = ['receipt_order', 'kind', 'code']
    
    def __str__(self) -> str:
        return f"[{self.code}] {self.name} ({self.get_kind_display()})"


class EmployeeConcept(models.Model):
    """
    Concepto asignado a un Empleado.
    
    Relación Many-to-Many entre Empleado y Concepto con atributos extra.
    Permite sobrescribir el valor global de un concepto para un empleado específico.
    """
    
    employee: models.ForeignKey = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='concepts',
        verbose_name='Empleado'
    )
    
    concept: models.ForeignKey = models.ForeignKey(
        PayrollConcept,
        on_delete=models.PROTECT,
        related_name='employee_assignments',
        verbose_name='Concepto'
    )
    
    override_value: models.DecimalField = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor Personalizado',
        help_text='Dejar en blanco para usar el valor global del concepto'
    )
    
    active: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Activo',
        help_text='Indica si este concepto se aplica al empleado'
    )
    
    notes: models.TextField = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Asignación'
    )
    
    class Meta:
        verbose_name = 'Asignación de Concepto'
        verbose_name_plural = 'Asignaciones de Conceptos'
        unique_together = ['employee', 'concept']
        ordering = ['employee', 'concept__code']
    
    def __str__(self) -> str:
        return f"{self.employee.full_name} - {self.concept.name}"
