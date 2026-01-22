"""
Modelos para Cuentas por Cobrar a Empleados (Préstamos y Anticipos).
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

from .employee import Employee
from customers.models import Currency
from .payroll import PayrollReceipt



class Loan(models.Model):
    """
    Representa un Préstamo o Anticipo otorgado a un empleado.
    
    Funciona como una cuenta por cobrar que se amortiza automáticamente
    a través de deducciones de nómina.
    
    Permite calcular intereses y cuotas automáticamente.
    """
    
    class LoanStatus(models.TextChoices):
        Draft = 'DRAFT', 'Borrador'
        Approved = 'APPROVED', 'Aprobado'  # No activo aún
        Active = 'ACTIVE', 'Activo'        # En proceso de cobro
        Paid = 'PAID', 'Pagado'            # Saldo 0
        Cancelled = 'CANCELLED', 'Anulado' # Cancelado administrativamente

    class Frequency(models.TextChoices):
        ALL_PAYROLLS = 'ALL', 'Todas las Nóminas'
        SECOND_FORTNIGHT = '2ND_Q', 'Solo 2da Quincena (Fin de Mes)'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='loans',
        verbose_name='Empleado'
    )
    
    description = models.CharField(
        max_length=200,
        verbose_name='Descripción',
        help_text='Ej: Anticipo Prestaciones, Préstamo Personal'
    )
    
    # Datos Financieros
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Monto Principal',
        help_text='Monto original solicitado (Sin incluir intereses)'
    )
    
    interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Tasa de Interés (%)',
        help_text='Porcentaje de ganancia o interés administrativo (0-100)'
    )
    
    balance = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Saldo Pendiente',
        help_text='Monto que resta por pagar (Incluye intereses)',
        blank=True, # Puede ser autocalculado
    )
    
    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        verbose_name='Moneda',
        help_text='Moneda del préstamo (USD o VES)'
    )
    
    # Condiciones del Préstamo
    num_installments = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name='Nro. Cuotas',
        help_text='Número de cuotas para pagar. Si se define, calcula la cuota automáticamente.'
    )
    
    installment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Monto Cuota',
        help_text='Monto a descontar por evento de nómina',
        blank=True, # Puede ser autocalculado
    )
    
    frequency = models.CharField(
        max_length=10,
        choices=Frequency.choices,
        default=Frequency.ALL_PAYROLLS,
        verbose_name='Frecuencia de Cobro'
    )
    
    status = models.CharField(
        max_length=10,
        choices=LoanStatus.choices,
        default=LoanStatus.Draft,
        verbose_name='Estado'
    )
    
    start_date = models.DateField(
        verbose_name='Fecha Inicio',
        help_text='Fecha a partir de la cual se comienza a cobrar'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Préstamo / Anticipo'
        verbose_name_plural = 'Préstamos y Anticipos'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee} - {self.description} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        # Lógica de cálculo o inicialización
        if not self.id: # Solo al crear (o si queremos recalcular siempre, quitar esta condición)
            # 1. Calcular Saldo Inicial con Intereses si el balance no fue forzado manuamente
            if self.balance is None:
                principal = self.amount
                interest_mult = Decimal('1.0') + (self.interest_rate / Decimal('100.0'))
                total_debt = principal * interest_mult
                self.balance = total_debt.quantize(Decimal('0.01'))
            
            # 2. Calcular Cuota si no se especificó pero sí hay Nro Cuotas
            if not self.installment_amount and self.num_installments and self.num_installments > 0:
                # Usar el balance recién calculado o existente
                quota = self.balance / Decimal(self.num_installments)
                self.installment_amount = quota.quantize(Decimal('0.01'))
        
        super().save(*args, **kwargs)


class LoanPayment(models.Model):
    """
    Registro de amortización (pago) de un préstamo.
    """
    
    loan = models.ForeignKey(
        Loan,
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name='Préstamo'
    )
    
    receipt = models.ForeignKey(
        PayrollReceipt,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='loan_payments',
        verbose_name='Recibo de Nómina',
        help_text='Nómina donde se realizó el descuento (opcional si es abono manual)'
    )

    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Monto Abonado',
        help_text='Monto restado al saldo (en la moneda del préstamo)'
    )
    
    payment_date = models.DateField(verbose_name='Fecha de Pago')
    
    exchange_rate_applied = models.DecimalField(
        max_digits=18, decimal_places=6,
        default=Decimal('1.000000'),
        verbose_name='Tasa Cambio',
        help_text='Tasa usada para convertir de VES a moneda del préstamo (si aplica)'
    )
    
    reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Referencia',
        help_text='Ej: Nómina Quincena 1 Enero o Transferencia #1234'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Abono a Préstamo'
        verbose_name_plural = 'Abonos a Préstamos'
        ordering = ['-payment_date']

    def __str__(self):
        return f"Abono {self.amount} - {self.loan}"
