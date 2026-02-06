"""
Modelos de procesamiento de nómina: Periodos, Recibos, Novedades.
"""
from django.db import models
from decimal import Decimal

from .employee import Employee
from .concepts import PayrollConcept


class PayrollPeriod(models.Model):
    """
    Define un lapso de tiempo para el procesamiento de nómina.
    Un periodo puede estar abierto (en preparación) o cerrado (histórico).
    """
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Abierto'
        CLOSED = 'CLOSED', 'Cerrado'

    name = models.CharField(
        max_length=100,
        verbose_name='Nombre del Periodo',
        help_text='Ej: 1ra Quincena Enero 2025'
    )
    start_date = models.DateField(verbose_name='Fecha Inicio')
    end_date = models.DateField(verbose_name='Fecha Fin')
    payment_date = models.DateField(verbose_name='Fecha de Pago')
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.OPEN,
        verbose_name='Estado'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Periodo de Nómina'
        verbose_name_plural = 'Periodos de Nómina'
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class PayrollReceipt(models.Model):

    """
    Cabecera de Recibo de Pago (Inmutable después del cierre).
    Almacena el resultado final y un snapshot del contrato.
    """
    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.PROTECT,
        related_name='receipts',

        verbose_name='Periodo'
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='receipts',

        verbose_name='Empleado'
    )
    
    class ReceiptStatus(models.TextChoices):

        DRAFT = 'DRAFT', 'Borrador'
        PAID = 'PAID', 'Pagado'

    # Snapshot del contrato al momento del cierre
    contract_snapshot = models.JSONField(
        verbose_name='Snapshot del Contrato',
        help_text='Copia de los datos del contrato (salario, cargo, etc.) al cerrar'
    )
    
    salary_base_snapshot = models.DecimalField(
        max_digits=18, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Salario Base Snapshot',
        help_text='Sueldo base del empleado al momento del cálculo'
    )

    
    total_income_ves = models.DecimalField(
        max_digits=18, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Total Ingresos (VES)'
    )
    total_deductions_ves = models.DecimalField(
        max_digits=18, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Total Deducciones (VES)'
    )
    net_pay_ves = models.DecimalField(
        max_digits=18, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Neto a Pagar (VES)'
    )
    
    status = models.CharField(
        max_length=10,
        choices=ReceiptStatus.choices,
        default=ReceiptStatus.DRAFT,
        verbose_name='Estado del Recibo'

    )

    # Datos de Auditoría (Tasa y Moneda usada)
    exchange_rate_snapshot = models.DecimalField(
        max_digits=18, decimal_places=6,
        default=Decimal('1.000000'),
        verbose_name='Tasa Snapshot',
        help_text='Tasa BCV utilizada para este recibo'
    )

    currency_code = models.CharField(
        max_length=3,
        default='VES',
        verbose_name='Moneda del Recibo',
        help_text='Generalmente VES'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def net_pay_usd_ref(self) -> Decimal:
        """
        Calcula el equivalente en USD basado en la tasa aplicada al momento del cierre.
        """
        if self.exchange_rate_snapshot > 0:
            return (self.net_pay_ves / self.exchange_rate_snapshot).quantize(Decimal('0.01'))
        return Decimal('0.00')


    @property
    def total_income_salario(self) -> Decimal:
        """Suma de ingresos del recibo 1 (Salario)"""
        return sum(d.amount_ves for d in self.lines.all() if d.kind == 'EARNING' and d.tipo_recibo == 'salario')

    @property
    def net_pay_salario(self) -> Decimal:
        """Neto a pagar del recibo 1 (Salario - Deducciones)"""
        income = self.total_income_salario
        deductions = self.total_deductions_ves # Todas las deducciones van al recibo de salario
        return income - deductions

    @property
    def complemento_amount(self) -> Decimal:
        """Monto del recibo 2 (Complemento)"""
        return sum(d.amount_ves for d in self.lines.all() if d.tipo_recibo == 'complemento')

    @property
    def cestaticket_amount(self) -> Decimal:
        """Monto del recibo 3 (Cestaticket)"""
        return sum(d.amount_ves for d in self.lines.all() if d.tipo_recibo == 'cestaticket')

    class Meta:
        verbose_name = 'Recibo de Nómina'
        verbose_name_plural = 'Recibos de Nómina'

        unique_together = ['period', 'employee']
        ordering = ['period', 'employee']

    def __str__(self):
        return f"Recibo: {self.id} - {self.employee.national_id} - {self.period.name}"



class PayrollNovelty(models.Model):
    """
    Almacena incidencias o variables transitorias para un periodo específico.
    Permite persistir horas extra, bono nocturno, faltas, etc. antes del cierre.
    """
    employee: models.ForeignKey = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='novelties',
        verbose_name='Empleado'
    )
    period: models.ForeignKey = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name='novelties',
        verbose_name='Periodo',
        limit_choices_to={'status': 'OPEN'}

    )
    concept_code: models.CharField = models.CharField(
        max_length=20,
        verbose_name='Código de Concepto',
        help_text='Debe coincidir con los códigos en formulas.py (ej: H_EXTRA, B_NOCTURNO, FALTAS)'
    )
    amount: models.DecimalField = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Monto/Cantidad',
        help_text='Valor de la novedad (horas, días o monto fijo)'
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Novedad de Nómina'
        verbose_name_plural = 'Novedades de Nómina'
        unique_together = ['employee', 'period', 'concept_code']
        ordering = ['employee', 'concept_code']

    def __str__(self) -> str:
        return f"{self.employee.full_name} - {self.concept_code}: {self.amount} ({self.period.name})"


class PayrollReceiptLine(models.Model):

    """
    Renglones Detallados de un Recibo.
    Contiene la copia de los datos del concepto para evitar pérdida de información histórica.
    """
    receipt = models.ForeignKey(
        PayrollReceipt,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name='Recibo'
    )

    
    # Des-normalización deliberada para inmutabilidad
    concept_code = models.CharField(max_length=20, verbose_name='Código Concepto')
    concept_name = models.CharField(max_length=150, verbose_name='Nombre Concepto')
    kind = models.CharField(
        max_length=20,
        choices=PayrollConcept.ConceptKind.choices,
        verbose_name='Tipo'
    )
    
    amount_ves = models.DecimalField(
        max_digits=18, decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Monto (VES)'
    )
    tipo_recibo = models.CharField(
        max_length=20,
        choices=[
            ('salario', 'Salario Base'),
            ('complemento', 'Complemento'),
            ('cestaticket', 'Cestaticket'),
        ],
        default='salario',
        verbose_name='Tipo de Recibo'
    )
    amount_src = models.DecimalField(
        max_digits=18, decimal_places=4,
        null=True, blank=True,
        verbose_name='Monto Original'
    )
    
    quantity = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Cantidad/Valor Auxiliar'
    )
    unit = models.CharField(
        max_length=20,
        default='días',
        verbose_name='Unidad'
    )

    percentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Porcentaje Aplicado'
    )
    
    calculation_log = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Log de Cálculo',
        help_text='Contiene trace, formula y variables del motor'
    )

    is_salary_incidence = models.BooleanField(
        default=False,
        verbose_name='Incidencia Salarial'
    )

    calculation_trace = models.TextField(blank=True, null=True, verbose_name='Traza de Cálculo (Legacy)')

    notes = models.TextField(blank=True, verbose_name='Notas')

    class Meta:
        verbose_name = 'Detalle de Recibo'
        verbose_name_plural = 'Detalles de Recibo'

    def __str__(self):
        return f"{self.concept_code}: {self.amount_ves}"

