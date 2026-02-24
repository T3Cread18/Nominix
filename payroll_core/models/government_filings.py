"""
Modelos para Declaraciones y Obligaciones Gubernamentales.

Cubre:
- ISLR: Retención de Impuesto Sobre la Renta (SENIAT)
- LPPSS: Contribución Especial de Pensiones 9%
- INCES: Contribución patronal 2%
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

from .employee import Employee


# =============================================================================
# ISLR — RETENCIÓN DE IMPUESTO SOBRE LA RENTA
# =============================================================================

class ISLRRetentionTable(models.Model):
    """
    Tabla de tarifas de retención ISLR vigente (SENIAT).
    
    Cada registro representa un tramo de la tabla progresiva.
    Se usa para calcular la retención mensual del empleado.
    
    Ejemplo de tramos 2024:
    - 0-1000 UT → 6% - Sustraendo 0
    - 1000-1500 UT → 9% - Sustraendo 30
    - etc.
    """
    
    # Vigencia
    year = models.PositiveIntegerField(
        verbose_name='Año Fiscal',
        help_text='Año en que aplica esta tabla'
    )
    
    # Tramo
    income_from_ut = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Desde (UT)',
        help_text='Límite inferior del tramo en Unidades Tributarias'
    )
    
    income_to_ut = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Hasta (UT)',
        help_text='Límite superior del tramo en UT (null = sin límite)'
    )
    
    # Tarifa
    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name='Tarifa (%)',
        help_text='Porcentaje de retención para este tramo'
    )
    
    subtrahend = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Sustraendo (UT)',
        help_text='Monto a restar después de aplicar la tarifa'
    )
    
    # Valor de la UT para este año
    ut_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Valor UT (Bs.)',
        help_text='Valor de la Unidad Tributaria en Bolívares para este año fiscal'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Activa'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Tramo ISLR'
        verbose_name_plural = 'Tabla de Retención ISLR'
        ordering = ['year', 'income_from_ut']
        unique_together = ['year', 'income_from_ut']
    
    def __str__(self):
        to_str = f"{self.income_to_ut}" if self.income_to_ut else "∞"
        return f"ISLR {self.year}: {self.income_from_ut}-{to_str} UT → {self.rate}%"


class ISLRRetention(models.Model):
    """
    Retención ISLR registrada para un empleado en un periodo.
    
    Se genera al cerrar nómina si el empleado tiene retención aplicable.
    """
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='islr_retentions',
        verbose_name='Empleado'
    )
    
    # Periodo
    year = models.PositiveIntegerField(verbose_name='Año')
    month = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        verbose_name='Mes'
    )
    
    # Montos
    taxable_income_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name='Base Imponible (Bs.)',
        help_text='Ingreso gravable del mes en VES'
    )
    
    retention_amount_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name='Monto Retenido (Bs.)',
        help_text='ISLR retenido en el mes'
    )
    
    accumulated_income_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Acumulado Anual (Bs.)',
        help_text='Ingreso acumulado del año hasta este mes'
    )
    
    accumulated_retention_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Retención Acumulada (Bs.)',
        help_text='Total retenido en el año hasta este mes'
    )
    
    # Referencia a la tabla usada
    rate_applied = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Tarifa Aplicada (%)'
    )
    
    ut_value_used = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Valor UT Usado (Bs.)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Retención ISLR'
        verbose_name_plural = 'Retenciones ISLR'
        unique_together = ['employee', 'year', 'month']
        ordering = ['employee', '-year', '-month']
    
    def __str__(self):
        return f"ISLR {self.employee} {self.month}/{self.year}: Bs.{self.retention_amount_ves}"


# =============================================================================
# LPPSS — CONTRIBUCIÓN ESPECIAL DE PENSIONES 9%
# =============================================================================

class LPPSSDeclaration(models.Model):
    """
    Declaración mensual de la Contribución Especial de Pensiones (LPPSS).
    
    Ley de Protección de Pensiones (G.O. Ext. 6.806, mayo 2024):
    - 9% sobre salarios + bonificaciones no salariales
    - Piso: IMII por trabajador
    - Declaración mensual ante SENIAT
    """
    
    class DeclarationStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Borrador'
        CALCULATED = 'CALCULATED', 'Calculado'
        DECLARED = 'DECLARED', 'Declarado ante SENIAT'
        PAID = 'PAID', 'Pagado'
    
    year = models.PositiveIntegerField(verbose_name='Año')
    month = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        verbose_name='Mes'
    )
    
    # Totales
    total_employees = models.PositiveIntegerField(
        default=0,
        verbose_name='Total Empleados'
    )
    
    total_payroll_base_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Base Total Nómina (Bs.)',
        help_text='Suma de salarios + bonificaciones (con piso IMII por trabajador)'
    )
    
    imii_usd_used = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='IMII USD Usado',
        help_text='Valor del IMII en USD al momento de la declaración'
    )
    
    exchange_rate_used = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        verbose_name='Tasa BCV Usada',
        help_text='Tasa de cambio para convertir IMII de USD a VES'
    )
    
    contribution_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('9.00'),
        verbose_name='Alícuota (%)',
        help_text='Porcentaje de contribución (actualmente 9%)'
    )
    
    contribution_amount_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Contribución Total (Bs.)',
        help_text='Monto total a pagar = base × alícuota'
    )
    
    status = models.CharField(
        max_length=10,
        choices=DeclarationStatus.choices,
        default=DeclarationStatus.DRAFT,
        verbose_name='Estado'
    )
    
    # Referencia SENIAT
    seniat_reference = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Nro. de Declaración SENIAT'
    )
    
    payment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Pago'
    )
    
    notes = models.TextField(blank=True, verbose_name='Notas')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True)
    
    class Meta:
        verbose_name = 'Declaración LPPSS'
        verbose_name_plural = 'Declaraciones LPPSS'
        unique_together = ['year', 'month']
        ordering = ['-year', '-month']
    
    def __str__(self):
        return f"LPPSS {self.month}/{self.year} - Bs.{self.contribution_amount_ves} ({self.get_status_display()})"


class LPPSSDeclarationLine(models.Model):
    """
    Detalle por empleado de la declaración LPPSS.
    """
    
    declaration = models.ForeignKey(
        LPPSSDeclaration,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name='Declaración'
    )
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        verbose_name='Empleado'
    )
    
    salary_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name='Salario (Bs.)',
        help_text='Salario mensual en VES'
    )
    
    bonuses_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Bonificaciones (Bs.)',
        help_text='Bonificaciones no salariales en VES'
    )
    
    imii_floor_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name='Piso IMII (Bs.)',
        help_text='IMII convertido a VES (mínimo por trabajador)'
    )
    
    base_applied_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name='Base Aplicada (Bs.)',
        help_text='max(salario + bonificaciones, IMII)'
    )
    
    contribution_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name='Contribución (Bs.)',
        help_text='base_applied × tasa'
    )
    
    class Meta:
        verbose_name = 'Línea LPPSS'
        verbose_name_plural = 'Líneas LPPSS'
        unique_together = ['declaration', 'employee']
    
    def __str__(self):
        return f"LPPSS {self.employee}: Bs.{self.contribution_ves}"


# =============================================================================
# INCES — CONTRIBUCIÓN PATRONAL 2%
# =============================================================================

class INCESDeclaration(models.Model):
    """
    Declaración trimestral del INCES.
    
    - Patronal: 2% sobre nómina total del trimestre
    - Empleado: 0.5% sobre utilidades (se calcula aparte)
    """
    
    class DeclarationStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Borrador'
        CALCULATED = 'CALCULATED', 'Calculado'
        DECLARED = 'DECLARED', 'Declarado'
        PAID = 'PAID', 'Pagado'
    
    year = models.PositiveIntegerField(verbose_name='Año')
    quarter = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        verbose_name='Trimestre (1-4)'
    )
    
    total_payroll_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Nómina Total Trimestre (Bs.)'
    )
    
    employer_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('2.00'),
        verbose_name='Tasa Patronal (%)'
    )
    
    employer_contribution_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Contribución Patronal (Bs.)'
    )
    
    status = models.CharField(
        max_length=10,
        choices=DeclarationStatus.choices,
        default=DeclarationStatus.DRAFT,
        verbose_name='Estado'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Declaración INCES'
        verbose_name_plural = 'Declaraciones INCES'
        unique_together = ['year', 'quarter']
        ordering = ['-year', '-quarter']
    
    def __str__(self):
        return f"INCES Q{self.quarter}/{self.year} - Bs.{self.employer_contribution_ves}"
