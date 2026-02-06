"""
Modelos para Prestaciones Sociales (LOTTT Art. 142).

Este módulo implementa un sistema de libro mayor inmutable para el registro
de prestaciones sociales con auditoría 100%.

REGLAS DE AUDITORÍA:
- Los registros del Ledger NUNCA se modifican ni eliminan
- Las correcciones se hacen mediante transacciones de reversión (contraasiento)
- Cada registro incluye trazabilidad completa: quién, cuándo, desde dónde
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

from .employee import Employee, LaborContract


# InterestRateBCV movido a customers.models (Esquema Público)


class SocialBenefitsLedger(models.Model):
    """
    Libro Mayor Inmutable de Prestaciones Sociales.
    
    Registra todos los movimientos de prestaciones sociales por empleado,
    incluyendo abonos trimestrales, días adicionales, intereses, anticipos
    y liquidaciones.
    
    REGLAS DE INMUTABILIDAD:
    - Los registros NUNCA se modifican (save() bloqueado después de crear)
    - Los registros NUNCA se eliminan (delete() bloqueado)
    - Las correcciones se realizan mediante transacciones de tipo REVERSAL
    """
    
    class TransactionType(models.TextChoices):
        GARANTIA = 'GARANTIA', 'Garantía Trimestral (15 días)'
        DIAS_ADIC = 'DIAS_ADIC', 'Días Adicionales por Antigüedad'
        INTERES = 'INTERES', 'Intereses sobre Saldo Acumulado'
        ANTICIPO = 'ANTICIPO', 'Anticipo de Prestaciones'
        LIQUIDACION = 'LIQUIDACION', 'Liquidación Final'
        REVERSAL = 'REVERSAL', 'Reversión/Contraasiento'
    
    # =========================================================================
    # RELACIONES
    # =========================================================================
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='social_benefits_ledger',
        verbose_name='Empleado'
    )
    contract = models.ForeignKey(
        LaborContract,
        on_delete=models.PROTECT,
        related_name='social_benefits_ledger',
        verbose_name='Contrato (Snapshot)',
        help_text='Contrato vigente al momento del movimiento'
    )
    reversed_entry = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='reversals',
        verbose_name='Entrada Revertida',
        help_text='Si es REVERSAL, apunta a la entrada original que se está revirtiendo'
    )
    
    # =========================================================================
    # CLASIFICACIÓN
    # =========================================================================
    transaction_type = models.CharField(
        max_length=15,
        choices=TransactionType.choices,
        verbose_name='Tipo de Transacción'
    )
    transaction_date = models.DateField(
        verbose_name='Fecha de Transacción'
    )
    period_description = models.CharField(
        max_length=50,
        verbose_name='Descripción del Periodo',
        help_text='Ej: "Q1-2026", "Año 2025", "Anticipo Marzo 2026"'
    )
    
    # =========================================================================
    # SNAPSHOT DE AUDITORÍA (Valores usados en el cálculo - INMUTABLES)
    # =========================================================================
    basis_days = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        verbose_name='Días Base',
        help_text='Días usados en el cálculo (15, 2, etc.)'
    )
    daily_salary_used = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Salario Integral Diario Usado',
        help_text='Salario integral diario al momento del cálculo'
    )
    interest_rate_used = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name='Tasa de Interés Usada (%)',
        help_text='Solo para transacciones tipo INTERES'
    )
    previous_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Saldo Anterior',
        help_text='Saldo antes de esta transacción'
    )
    
    # =========================================================================
    # CAMPOS FINANCIEROS
    # =========================================================================
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Monto',
        help_text='Monto de la transacción (positivo=abono, negativo=cargo)'
    )
    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Saldo Post-Movimiento',
        help_text='Saldo acumulado después de esta transacción'
    )
    
    # =========================================================================
    # TRAZABILIDAD DEL CÁLCULO
    # =========================================================================
    calculation_formula = models.CharField(
        max_length=200,
        verbose_name='Fórmula Aplicada',
        help_text='La fórmula usada: ej "basis_days * daily_salary_used"'
    )
    calculation_trace = models.TextField(
        verbose_name='Traza del Cálculo',
        help_text='Fórmula expandida con valores: ej "15 * 125.50 = 1882.50"'
    )
    
    # =========================================================================
    # AUDITORÍA COMPLETA
    # =========================================================================
    reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Referencia Externa',
        help_text='Número de documento, recibo, etc.'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    created_by = models.CharField(
        max_length=100,
        verbose_name='Creado por',
        help_text='Usuario o proceso que creó el registro'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Dirección IP',
        help_text='IP desde donde se creó el registro'
    )
    user_agent = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='User Agent',
        help_text='Navegador/Cliente usado'
    )
    
    class Meta:
        verbose_name = 'Movimiento de Prestaciones'
        verbose_name_plural = 'Libro de Prestaciones Sociales'
        ordering = ['employee', '-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['employee', '-transaction_date']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['contract']),
        ]
    
    def __str__(self):
        return f"{self.employee} | {self.get_transaction_type_display()} | {self.amount}"
    
    def save(self, *args, **kwargs):
        """
        Bloquea modificaciones después de la creación inicial.
        
        Los registros del Ledger son INMUTABLES. Para corregir errores,
        se debe crear una transacción de tipo REVERSAL.
        """
        if self.pk:  # Ya existe en BD
            raise ValueError(
                "Los registros del Ledger son INMUTABLES. "
                "Para corregir, cree una transacción de tipo REVERSAL."
            )
        
        # Calcular balance automáticamente
        if self.previous_balance is not None and self.amount is not None:
            self.balance = self.previous_balance + self.amount
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """
        Bloquea eliminación de registros.
        
        Los registros del Ledger NO pueden eliminarse. Para anular,
        se debe crear una transacción de tipo REVERSAL.
        """
        raise ValueError(
            "Los registros del Ledger NO pueden eliminarse. "
            "Para anular, cree una transacción de tipo REVERSAL."
        )


class SocialBenefitsSettlement(models.Model):
    """
    Liquidación Final de Prestaciones Sociales (Art. 142 LOTTT).
    
    Al terminar la relación laboral, se calcula el monto a pagar comparando:
    - Literal "c": Garantía acumulada + Días adicionales + Intereses - Anticipos
    - Literal "d": 30 días por cada año de antigüedad (retroactivo)
    
    Se paga EL MAYOR de los dos montos.
    """
    
    class SettlementStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Borrador'
        CALCULATED = 'CALCULATED', 'Calculado'
        APPROVED = 'APPROVED', 'Aprobado'
        PAID = 'PAID', 'Pagado'
        VOIDED = 'VOIDED', 'Anulado'
    
    class ChosenMethod(models.TextChoices):
        GARANTIA = 'GARANTIA', 'Garantía (Art. 142 literal c)'
        RETROACTIVO = 'RETROACTIVO', 'Retroactivo (Art. 142 literal d)'
    
    # =========================================================================
    # RELACIÓN PRINCIPAL
    # =========================================================================
    contract = models.OneToOneField(
        LaborContract,
        on_delete=models.PROTECT,
        related_name='social_benefits_settlement',
        verbose_name='Contrato'
    )
    
    # =========================================================================
    # SNAPSHOT DEL EMPLEADO AL MOMENTO DE LIQUIDAR
    # =========================================================================
    employee_national_id = models.CharField(
        max_length=15,
        verbose_name='Cédula'
    )
    employee_full_name = models.CharField(
        max_length=200,
        verbose_name='Nombre Completo'
    )
    hire_date = models.DateField(
        verbose_name='Fecha de Ingreso'
    )
    termination_date = models.DateField(
        verbose_name='Fecha de Egreso'
    )
    
    # =========================================================================
    # CÁLCULO GARANTÍA (Literal "c")
    # =========================================================================
    total_garantia = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Total Garantía',
        help_text='Suma de todos los abonos tipo GARANTIA'
    )
    total_dias_adicionales = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Total Días Adicionales',
        help_text='Suma de todos los abonos tipo DIAS_ADIC'
    )
    total_intereses = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Total Intereses',
        help_text='Suma de todos los abonos tipo INTERES'
    )
    total_anticipos = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Total Anticipos',
        help_text='Suma de todos los ANTICIPO (monto a restar)'
    )
    net_garantia = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Neto Garantía',
        help_text='= total_garantia + total_dias_adicionales + total_intereses - total_anticipos'
    )
    
    # =========================================================================
    # CÁLCULO RETROACTIVO (Literal "d")
    # =========================================================================
    years_of_service = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Años de Servicio',
        help_text='Antigüedad en años (con decimales)'
    )
    retroactive_days = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name='Días Retroactivos',
        help_text='30 días * años de servicio'
    )
    final_daily_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Salario Integral Diario Final',
        help_text='Salario integral diario al momento de terminar'
    )
    retroactive_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Monto Retroactivo',
        help_text='= retroactive_days * final_daily_salary'
    )
    
    # =========================================================================
    # RESULTADO DE LA COMPARACIÓN
    # =========================================================================
    chosen_method = models.CharField(
        max_length=15,
        choices=ChosenMethod.choices,
        verbose_name='Método Elegido',
        help_text='El que resulte mayor entre Garantía y Retroactivo'
    )
    settlement_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Monto de Liquidación',
        help_text='Monto final a pagar al trabajador'
    )
    
    # =========================================================================
    # TRAZABILIDAD DEL CÁLCULO
    # =========================================================================
    calculation_summary = models.TextField(
        verbose_name='Resumen del Cálculo',
        help_text='Explicación detallada del cálculo realizado'
    )
    
    # =========================================================================
    # ESTADO Y AUDITORÍA
    # =========================================================================
    settlement_date = models.DateField(
        verbose_name='Fecha de Liquidación'
    )
    status = models.CharField(
        max_length=12,
        choices=SettlementStatus.choices,
        default=SettlementStatus.DRAFT,
        verbose_name='Estado'
    )
    
    # Auditoría de Creación
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    created_by = models.CharField(
        max_length=100,
        verbose_name='Creado por'
    )
    created_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP Creación'
    )
    
    # Auditoría de Aprobación
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Aprobación'
    )
    approved_by = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Aprobado por'
    )
    approved_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP Aprobación'
    )
    
    # Auditoría de Pago
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Pago'
    )
    paid_by = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Pagado por'
    )
    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Referencia de Pago'
    )
    
    # Auditoría de Anulación
    voided_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Anulación'
    )
    voided_by = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Anulado por'
    )
    void_reason = models.TextField(
        blank=True,
        verbose_name='Motivo de Anulación'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    class Meta:
        verbose_name = 'Liquidación de Prestaciones'
        verbose_name_plural = 'Liquidaciones de Prestaciones'
        ordering = ['-settlement_date']
    
    def __str__(self):
        return f"Liquidación {self.employee_full_name} - {self.settlement_date}"
