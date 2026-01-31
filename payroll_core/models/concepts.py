"""
Modelos de conceptos de nómina (Asignaciones y Deducciones).
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

from customers.models import Currency
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
        verbose_name='Fórmula',
        help_text='''Para DYNAMIC_FORMULA: Fórmula completa (ej: SALARIO_DIARIO * DIAS).
Para FIXED_AMOUNT: Fórmula de AJUSTE que se SUMA al monto fijo (ej: OTRO_CONCEPTO - DESCUENTO).
Variables especiales para ajuste: VALOR_BASE, CANTIDAD, MONTO_CALCULADO, y todos los conceptos calculados previamente.'''
    )

    class ConceptBehavior(models.TextChoices):
        """Comportamiento del concepto (determina qué Handler usar)."""
        SALARY_BASE = 'SALARY_BASE', 'Sueldo Base (Desglosable)'
        CESTATICKET = 'CESTATICKET', 'Cestaticket'
        COMPLEMENT = 'COMPLEMENT', 'Complemento Salarial'
        LAW_DEDUCTION = 'LAW_DEDUCTION', 'Deducción de Ley (IVSS, FAOV, RPE)'
        LOAN = 'LOAN', 'Préstamo / Anticipo'
        DYNAMIC = 'DYNAMIC', 'Fórmula Dinámica'
        FIXED = 'FIXED', 'Monto Fijo'

    class CalculationBase(models.TextChoices):
        """Base de cálculo para el concepto (Total Paquete vs Sueldo Base)."""
        TOTAL = 'TOTAL', 'Salario Total (Base + Complemento)'
        BASE = 'BASE', 'Sueldo Base Únicamente'

    calculation_base: models.CharField = models.CharField(
        max_length=10,
        choices=CalculationBase.choices,
        default=CalculationBase.TOTAL,
        verbose_name='Base de Cálculo',
        help_text='Indica si el cálculo se basa en el total del contrato o solo en el sueldo base'
    )

    behavior: models.CharField = models.CharField(
        max_length=20,
        choices=ConceptBehavior.choices,
        default=ConceptBehavior.DYNAMIC,
        verbose_name='Comportamiento',
        help_text='Define cómo el motor procesa este concepto'
    )

    system_params: models.JSONField = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Parámetros de Sistema',
        help_text='Configuración del Handler (rate, base_source, cap_multiplier, etc.)'
    )

    deducts_from_base_salary: models.BooleanField = models.BooleanField(
        default=False,
        verbose_name='Resta Días del Sueldo Base',
        help_text='Si es True, la cantidad reportada en novedades se resta de los días y valor del Sueldo Base.'
    )

    adds_to_complement: models.BooleanField = models.BooleanField(
        default=False,
        verbose_name='Suma al Complemento/Bono',
        help_text='Si es True, el monto resultante se suma a la variable COMPLEMENTO_MENSUAL/PERIOD en el cálculo.'
    )

    class TipoRecibo(models.TextChoices):
        """Tipo de recibo donde aparece el concepto."""
        SALARIO = 'salario', 'Salario Base'
        COMPLEMENTO = 'complemento', 'Complemento'
        CESTATICKET = 'cestaticket', 'Cestaticket'
        VACACIONES = 'vacaciones', 'Vacaciones'

    tipo_recibo: models.CharField = models.CharField(
        max_length=20,
        choices=TipoRecibo.choices,
        default=TipoRecibo.SALARIO,
        verbose_name='Tipo de Recibo',
        help_text='Determina en qué tipo de recibo aparecerá este concepto.'
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
