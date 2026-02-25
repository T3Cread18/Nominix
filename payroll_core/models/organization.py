"""
Modelos de estructura organizacional: Sedes, Departamentos, Cargos, Empresa.

Jerarquía:
    Company (Tenant/Esquema) -> Branch (Sede) -> Department -> JobPosition (Cargo)
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

from customers.models import Currency
from simple_history.models import HistoricalRecords


class Branch(models.Model):
    """
    Modelo de Sede (Branch).
    
    Permite gestionar múltiples sedes, sucursales o ubicaciones dentro de un mismo tenant.
    Ejemplo: Sede Principal, Sucursal Norte, Sucursal Centro.
    """
    
    name: models.CharField = models.CharField(
        max_length=100,
        verbose_name='Nombre de la Sede',
        help_text='Nombre descriptivo de la sucursal (ej: Sucursal Centro)'
    )
    
    code: models.CharField = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Código',
        help_text='Código interno único para identificar la sede (ej: B001)'
    )
    
    address: models.TextField = models.TextField(
        blank=True,
        verbose_name='Dirección Física',
        help_text='Dirección completa de la sede'
    )
    
    phone: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Teléfono',
        help_text='Teléfono de contacto de la sede'
    )
    
    is_active: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Activa',
        help_text='Indica si la sede está operativa'
    )
    
    is_main: models.BooleanField = models.BooleanField(
        default=False,
        verbose_name='Sede Principal',
        help_text='Indica si es la sede principal del tenant. Solo puede haber una.'
    )
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    rif: models.CharField = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        verbose_name='RIF',
        help_text='RIF de la sede'
    )
    
    class Meta:
        verbose_name = 'Sede'
        verbose_name_plural = 'Sedes'
        ordering = ['-is_main', 'name']  # Sede principal primero
    
    def __str__(self) -> str:
        suffix = ' (Principal)' if self.is_main else ''
        return f"{self.name} ({self.code}){suffix}"
    
    def save(self, *args, **kwargs) -> None:
        """
        Asegura que solo una sede sea la principal.
        Si se marca como principal, desmarca las demás.
        """
        if self.is_main:
            Branch.objects.filter(is_main=True).exclude(pk=self.pk).update(is_main=False)
        super().save(*args, **kwargs)


class Department(models.Model):
    """Modelo de Departamento organizacional."""
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    supervisor = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    branch = models.ForeignKey(
        Branch, 
        related_name='departments', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = 'Departamento'
        verbose_name_plural = 'Departamentos'
        ordering = ['branch', 'name']
    
    def __str__(self) -> str:
        if self.branch:
            return f"{self.name} ({self.branch.name})"
        return self.name


class JobPosition(models.Model):
    """
    Modelo de Cargo (Posición Laboral).
    
    Define los cargos disponibles dentro de un departamento, junto con
    el sueldo base por defecto para contratos asociados a este cargo.
    
    Jerarquía: Branch -> Department -> JobPosition -> LaborContract
    
    Attributes:
        department: Departamento al que pertenece el cargo
        name: Nombre del cargo (ej: Gerente de Operaciones)
        code: Código interno único del cargo (ej: GER-OPS-001)
        default_total_salary: Sueldo mensual total por defecto para este cargo
        currency: Moneda del sueldo (generalmente USD)
    """
    
    department: models.ForeignKey = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='job_positions',
        verbose_name='Departamento',
        help_text='Departamento al que pertenece este cargo'
    )
    
    name: models.CharField = models.CharField(
        max_length=100,
        verbose_name='Nombre del Cargo',
        help_text='Nombre descriptivo del cargo (ej: Analista Senior)'
    )
    
    code: models.CharField = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Código',
        help_text='Código interno único del cargo (ej: ANA-SR-001)'
    )
    
    description: models.TextField = models.TextField(
        blank=True,
        verbose_name='Descripción',
        help_text='Descripción de funciones y responsabilidades del cargo'
    )
    
    # ==========================================================================
    # CONFIGURACIÓN SALARIAL POR DEFECTO
    # ==========================================================================
    
    default_total_salary: models.DecimalField = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Sueldo Total Mensual',
        help_text='Sueldo mensual base para contratos con este cargo (en moneda seleccionada)'
    )
    
    currency: models.ForeignKey = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        default='USD',
        related_name='job_positions',
        verbose_name='Moneda',
        help_text='Moneda del sueldo base (generalmente USD)'
    )
    
    split_fixed_amount: models.DecimalField = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Monto Fijo (Estrategia)',
        help_text='Monto fijo para usar en estrategias FIXED_BASE o FIXED_BONUS'
    )

    split_fixed_currency: models.ForeignKey = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        default='USD',
        related_name='job_positions_fixed',
        verbose_name='Moneda Monto Fijo',
        help_text='Moneda del monto fijo para la estrategia (ej: USD)'
    )
    
    # ==========================================================================
    # ESTADO Y METADATA
    # ==========================================================================
    
    is_active: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Activo',
        help_text='Indica si el cargo está disponible para nuevos contratos'
    )
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    updated_at: models.DateTimeField = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )
    
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = 'Cargo'
        verbose_name_plural = 'Cargos'
        ordering = ['department', 'name']
        indexes = [
            models.Index(fields=['department', 'is_active']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self) -> str:
        return f"{self.name} ({self.department.name})"
    
    @property
    def branch(self):
        """Retorna la sede a través del departamento."""
        return self.department.branch if self.department else None


class Company(models.Model):
    """
    Modelo Singleton para la configuración de la empresa/tenant.
    """
    name = models.CharField(max_length=200, verbose_name="Razón Social")
    rif = models.CharField(max_length=20, verbose_name="RIF", help_text="J-12345678-9")
    
    # Contacto
    email = models.EmailField(blank=True, null=True, verbose_name="Email Corporativo")
    phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="Teléfono")
    website = models.URLField(blank=True, null=True, verbose_name="Sitio Web")
    
    # Ubicación
    address = models.TextField(blank=True, null=True, verbose_name="Dirección Fiscal")
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ciudad")
    state = models.CharField(max_length=100, blank=True, null=True, verbose_name="Estado")
    
    # Configuración
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True, verbose_name="Logo")
    primary_color = models.CharField(max_length=7, default="#3b82f6", verbose_name="Color Primario")
    
    # Nómina Parametrizada
    national_minimum_salary = models.DecimalField(
        max_digits=18, decimal_places=2, 
        default=Decimal('130.00'),
        verbose_name="Salario Mínimo Nacional",
        help_text="Base para deducciones de ley (IVSS, RPE)"
    )
    
    base_currency_symbol = models.CharField(max_length=5, default="Bs.", verbose_name="Símbolo Moneda Base")
    
    # ==========================================================================
    # ESTRATEGIA SALARIAL (Distribución Base + Complemento)
    # ==========================================================================
    
    class SalarySplitMode(models.TextChoices):
        """
        Modos de distribución del salario total entre base y complemento.
        
        - PERCENTAGE: El sueldo base es un % del total (ej: 30% base, 70% complemento)
        - FIXED_BASE: El sueldo base es fijo, el resto es complemento variable
        - FIXED_BONUS: El complemento es fijo, la base es variable
        """
        PERCENTAGE = 'PERCENTAGE', 'Porcentaje (Base = % del Total)'
        FIXED_BASE = 'FIXED_BASE', 'Base Fija + Complemento Variable'
        FIXED_BONUS = 'FIXED_BONUS', 'Complemento Fijo + Base Variable'
    
    salary_split_mode = models.CharField(
        max_length=15,
        choices=SalarySplitMode.choices,
        default=SalarySplitMode.PERCENTAGE,
        verbose_name="Modo de Distribución Salarial",
        help_text="Cómo se divide el salario total entre base y complemento"
    )
    
    split_percentage_base = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('30.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        verbose_name="Porcentaje Base (%)",
        help_text="Para modo PERCENTAGE: porcentaje del total que es sueldo base (ej: 30.00)"
    )

    # Configuración de Frecuencias y Pagos
    PAYROLL_JOURNEY_CHOICES = [
        ('WEEKLY', 'Semanal'),
        ('BIWEEKLY', 'Quincenal'),
        ('MONTHLY', 'Mensual'),
    ]
    payroll_journey = models.CharField(
        max_length=10, 
        choices=PAYROLL_JOURNEY_CHOICES, 
        default='BIWEEKLY',
        verbose_name="Frecuencia de Nómina Principal"
    )
    
    CESTATICKET_JOURNEY_CHOICES = [
        ('MONTHLY', 'Mensual (Única fecha)'),
        ('PERIODIC', 'Proporcional en cada pago'),
    ]
    cestaticket_journey = models.CharField(
        max_length=10, 
        choices=CESTATICKET_JOURNEY_CHOICES, 
        default='MONTHLY',
        verbose_name="Frecuencia de Cestaticket"
    )
    
    cestaticket_payment_day = models.PositiveSmallIntegerField(
        default=30,
        verbose_name="Día de Pago Cestaticket",
        help_text="Si es mensual, día del mes en que se abona (ej: 30 para fin de mes)"
    )

    # Configuración de Visibilidad en Recibo
    show_base_salary = models.BooleanField(default=True, verbose_name="Mostrar Sueldo Base en Recibo")
    show_supplement = models.BooleanField(default=True, verbose_name="Mostrar Complemento en Recibo")
    show_tickets = models.BooleanField(default=True, verbose_name="Mostrar Cestaticket en Recibo")
    show_seniority = models.BooleanField(default=True, verbose_name="Mostrar Antigüedad en Recibo")

    # ==========================================================================
    # CONFIGURACIÓN DE VACACIONES
    # ==========================================================================
    
    class VacationSalaryBasis(models.TextChoices):
        """Base salarial para cálculo de vacaciones."""
        BASE_ONLY = 'BASE_ONLY', 'Solo Sueldo Base'
        BASE_PLUS_COMPLEMENT = 'BASE_PLUS_COMPLEMENT', 'Sueldo Base + Complemento (Paquete Total)'
    
    vacation_salary_basis = models.CharField(
        max_length=25,
        choices=VacationSalaryBasis.choices,
        default=VacationSalaryBasis.BASE_PLUS_COMPLEMENT,
        verbose_name="Base Salarial para Vacaciones",
        help_text="Define qué componentes del sueldo inciden en el pago de vacaciones"
    )
    
    class VacationReceiptCurrency(models.TextChoices):
        """Moneda para recibo de vacaciones."""
        USD = 'USD', 'Dólares (USD)'
        VES = 'VES', 'Bolívares (Bs.)'
        DUAL = 'DUAL', 'Ambas Monedas'
    
    vacation_receipt_currency = models.CharField(
        max_length=10,
        choices=VacationReceiptCurrency.choices,
        default=VacationReceiptCurrency.USD,
        verbose_name="Moneda del Recibo de Vacaciones",
        help_text="En qué moneda se muestran los montos del recibo PDF"
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Configuración de Empresa"
        verbose_name_plural = "Configuración de Empresa"

    def __str__(self):
        return self.name

        super().save(*args, **kwargs)


class PayrollPolicy(models.Model):
    """
    Políticas de Nómina y Factores Globales.
    
    Este modelo centraliza los factores de cálculo que aplican a toda la empresa,
    permitiendo ajustar porcentajes de recargos sin modificar fórmulas.
    """
    company = models.OneToOneField(
        Company, 
        on_delete=models.CASCADE, 
        related_name='policy',
        verbose_name="Empresa"
    )
    
    # Factores de pago (Multiplicadores)
    holiday_payout_factor = models.DecimalField(
        max_digits=5, decimal_places=2, 
        default=Decimal('1.50'),
        verbose_name="Factor Feriados",
        help_text="Multiplicador para días feriados trabajados (ej: 1.50)"
    )
    
    rest_day_payout_factor = models.DecimalField(
        max_digits=5, decimal_places=2, 
        default=Decimal('1.50'),
        verbose_name="Factor Descansos",
        help_text="Multiplicador para días de descanso trabajados"
    )
    
    overtime_day_factor = models.DecimalField(
        max_digits=5, decimal_places=2, 
        default=Decimal('1.50'),
        verbose_name="Horas Extra Diurnas",
        help_text="Recargo para horas extras diurnas (ej: 1.50 = 50% recargo)"
    )
    
    overtime_night_factor = models.DecimalField(
        max_digits=5, decimal_places=2, 
        default=Decimal('1.50'),
        verbose_name="Horas Extra Nocturnas",
        help_text="Recargo para horas extras nocturnas"
    )
    
    night_bonus_rate = models.DecimalField(
        max_digits=5, decimal_places=2, 
        default=Decimal('0.30'),
        verbose_name="Bono Nocturno (%)",
        help_text="Porcentaje de recargo por bono nocturno (ej: 0.30 = 30%)"
    )

    # Configuración de Vacaciones (LOTTT)
    vacation_days_base = models.PositiveSmallIntegerField(
        default=15,
        verbose_name="Días Base Vacaciones",
        help_text="Días correspondientes al primer año (Art. 190)"
    )
    
    vacation_days_per_year = models.PositiveSmallIntegerField(
        default=1,
        verbose_name="Días Adicionales por Año",
        help_text="Días adicionales por cada año de servicio"
    )
    
    vacation_days_max = models.PositiveSmallIntegerField(
        default=15,
        verbose_name="Máximo Días Adicionales",
        help_text="Tope de días adicionales acumulables (Total máx = Base + Máx)"
    )
    
    vacation_bonus_days_base = models.PositiveSmallIntegerField(
        default=15,
        verbose_name="Días Base Bono Vacacional",
        help_text="Días de bono para el primer año (Art. 192)"
    )
    
    vacation_bonus_days_per_year = models.PositiveSmallIntegerField(
        default=1,
        verbose_name="Días Adicionales Bono por Año",
        help_text="Días adicionales de bono por cada año de servicio"
    )
    
    vacation_bonus_days_max = models.PositiveSmallIntegerField(
        default=30,
        verbose_name="Máximo Días Bono Vacacional",
        help_text="Tope máximo de días de bono vacacional"
    )
    
    # Campos adicionales para configuración No-Code
    min_service_months = models.PositiveSmallIntegerField(
        default=12,
        verbose_name="Meses Mínimos para Derecho",
        help_text="Antigüedad mínima en meses para generar derecho a vacaciones (LOTTT: 12)"
    )
    
    pay_rest_days = models.BooleanField(
        default=True,
        verbose_name="Pagar Días de Descanso",
        help_text="Incluir sábados/domingos del período vacacional en el pago"
    )
    
    pay_holidays = models.BooleanField(
        default=True,
        verbose_name="Pagar Feriados",
        help_text="Incluir feriados nacionales del período vacacional en el pago"
    )
    
    class AccrualMode(models.TextChoices):
        """Modo de acumulación de días de vacaciones."""
        ANNUAL = 'ANNUAL', 'Anual (Al cumplir cada año)'
        MONTHLY = 'MONTHLY', 'Mensual Proporcional'
        PROPORTIONAL = 'PROPORTIONAL', 'Proporcional a Días Trabajados'
    
    accrual_mode = models.CharField(
        max_length=15,
        choices=AccrualMode.choices,
        default=AccrualMode.ANNUAL,
        verbose_name="Modo de Acumulación",
        help_text="Cómo se acumulan los días de vacaciones"
    )

    # ==========================================================================
    # PARÁMETROS GUBERNAMENTALES (No-Code)
    # ==========================================================================
    
    minimum_wage_ves = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('130.00'),
        verbose_name="Salario Mínimo (Bs.)",
        help_text="Salario mínimo mensual vigente en VES. Usado como tope IVSS."
    )
    
    imii_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('130.00'),
        verbose_name="IMII (USD)",
        help_text="Ingreso Mínimo Integral Indexado en USD. Piso para LPPSS."
    )
    
    cestaticket_amount_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('40.00'),
        verbose_name="Cestaticket (USD)",
        help_text="Monto legal del cestaticket en USD."
    )
    
    ut_value_ves = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('9.00'),
        verbose_name="Valor UT (Bs.)",
        help_text="Valor de la Unidad Tributaria vigente. Usado para cálculos ISLR."
    )
    
    # Tasas de deducciones (porcentajes, configurables)
    ivss_employee_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('4.00'),
        verbose_name="IVSS Empleado (%)",
        help_text="Porcentaje de IVSS a cargo del trabajador"
    )
    
    rpe_employee_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.50'),
        verbose_name="RPE Empleado (%)",
        help_text="Paro Forzoso a cargo del trabajador"
    )
    
    faov_employee_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        verbose_name="FAOV Empleado (%)",
        help_text="FAOV (Vivienda) a cargo del trabajador"
    )
    
    lppss_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('9.00'),
        verbose_name="LPPSS (%)",
        help_text="Contribución Especial de Pensiones (LPPSS). Actualmente 9%."
    )
    
    inces_employer_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('2.00'),
        verbose_name="INCES Patronal (%)",
        help_text="Contribución patronal INCES. Actualmente 2%."
    )
    
    ivss_salary_cap_multiplier = models.PositiveSmallIntegerField(
        default=5,
        verbose_name="Tope IVSS (x SM)",
        help_text="El IVSS se calcula sobre un máximo de N salarios mínimos"
    )

    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Política de Nómina"
        verbose_name_plural = "Políticas de Nómina"

    def __str__(self):
        return f"Políticas de {self.company.name}"

