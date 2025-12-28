"""
Modelos de la app Payroll Core - Esquema Tenant.

Define los modelos core para el sistema de nómina venezolano:
- Currency: Monedas soportadas (USD, VES, EUR)
- ExchangeRate: Tasas de cambio (BCV, Monitor)
- Employee: Empleados con datos específicos de Venezuela
- LaborContract: Contratos laborales
"""
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
from decimal import Decimal
from typing import Optional
import datetime


class Currency(models.Model):
    """
    Modelo de Moneda.
    
    Define las monedas soportadas por el sistema.
    En Venezuela típicamente se manejan: USD, VES (Bolívar Digital), EUR.
    
    Attributes:
        code: Código ISO de la moneda (clave primaria)
        name: Nombre descriptivo de la moneda
        symbol: Símbolo de la moneda (ej: $, Bs., €)
        is_base_currency: Indica si es la moneda base para reportes
        is_active: Indica si la moneda está activa para uso
    """
    
    code: models.CharField = models.CharField(
        max_length=3,
        primary_key=True,
        verbose_name='Código',
        help_text='Código ISO de 3 letras (ej: USD, VES, EUR)'
    )
    
    name: models.CharField = models.CharField(
        max_length=50,
        verbose_name='Nombre',
        help_text='Nombre completo de la moneda'
    )
    
    symbol: models.CharField = models.CharField(
        max_length=5,
        default='$',
        verbose_name='Símbolo',
        help_text='Símbolo de la moneda (ej: $, Bs., €)'
    )
    
    is_base_currency: models.BooleanField = models.BooleanField(
        default=False,
        verbose_name='Es Moneda Base',
        help_text='Indica si es la moneda principal para reportes (generalmente VES)'
    )
    
    is_active: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Activa'
    )
    
    decimal_places: models.PositiveSmallIntegerField = models.PositiveSmallIntegerField(
        default=2,
        verbose_name='Decimales',
        help_text='Cantidad de decimales para mostrar'
    )
    
    class Meta:
        verbose_name = 'Moneda'
        verbose_name_plural = 'Monedas'
        ordering = ['code']
    
    def __str__(self) -> str:
        """Representación en string de la moneda."""
        return f"{self.code} - {self.name}"
    
    def save(self, *args, **kwargs) -> None:
        """
        Asegura que solo una moneda sea la base.
        """
        if self.is_base_currency:
            # Desactivar otras monedas base
            Currency.objects.filter(is_base_currency=True).update(is_base_currency=False)
        super().save(*args, **kwargs)


class ExchangeRate(models.Model):
    """
    Modelo de Tasa de Cambio.
    
    Almacena las tasas de cambio oficiales y paralelas.
    El BCV actualiza las tasas a las 9:00 AM y 1:00 PM.
    
    Attributes:
        currency: Moneda de origen (se convierte a VES)
        rate: Tasa de cambio con 6 decimales para precisión
        date_valid: Fecha y hora de validez de la tasa
        source: Fuente de la tasa (BCV, Monitor Dólar, etc.)
    """
    
    class RateSource(models.TextChoices):
        """Fuentes de tasas de cambio en Venezuela."""
        BCV = 'BCV', 'Banco Central de Venezuela'
        MONITOR = 'MONITOR', 'Monitor Dólar'
        PARALELO = 'PARALELO', 'Mercado Paralelo'
        PROMEDIO = 'PROMEDIO', 'Promedio de Mercado'
    
    currency: models.ForeignKey = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='exchange_rates',
        verbose_name='Moneda',
        help_text='Moneda de origen para la conversión'
    )
    
    rate: models.DecimalField = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        validators=[MinValueValidator(Decimal('0.000001'))],
        verbose_name='Tasa',
        help_text='Tasa de cambio a Bolívares (6 decimales para precisión)'
    )
    
    date_valid: models.DateTimeField = models.DateTimeField(
        verbose_name='Fecha de Validez',
        help_text='Fecha y hora de la tasa (BCV actualiza a las 9am y 1pm)'
    )
    
    source: models.CharField = models.CharField(
        max_length=20,
        choices=RateSource.choices,
        default=RateSource.BCV,
        verbose_name='Fuente',
        help_text='Origen de la tasa de cambio'
    )
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Registro'
    )
    
    notes: models.TextField = models.TextField(
        blank=True,
        verbose_name='Notas',
        help_text='Observaciones adicionales'
    )
    
    class Meta:
        verbose_name = 'Tasa de Cambio'
        verbose_name_plural = 'Tasas de Cambio'
        ordering = ['-date_valid']
        # Evitar duplicados de misma moneda, fecha y fuente
        unique_together = ['currency', 'date_valid', 'source']
        indexes = [
            models.Index(fields=['currency', '-date_valid']),
            models.Index(fields=['source', '-date_valid']),
        ]
    
    def __str__(self) -> str:
        """Representación en string de la tasa."""
        return f"{self.currency.code}: {self.rate} VES ({self.source} - {self.date_valid.strftime('%d/%m/%Y %H:%M')})"



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
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    class Meta:
        verbose_name = 'Sede'
        verbose_name_plural = 'Sedes'
        ordering = ['name']
    
    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class Employee(models.Model):
    """
    Modelo de Empleado.
    
    Almacena la información del empleado con campos específicos
    para cumplir con la legislación laboral venezolana.
    """
    
    class Gender(models.TextChoices):
        """Género del empleado."""
        MALE = 'M', 'Masculino'
        FEMALE = 'F', 'Femenino'
    
    class MaritalStatus(models.TextChoices):
        """Estado civil del empleado."""
        SINGLE = 'S', 'Soltero(a)'
        MARRIED = 'M', 'Casado(a)'
        DIVORCED = 'D', 'Divorciado(a)'
        WIDOWED = 'W', 'Viudo(a)'
        COHABITING = 'C', 'Concubino(a)'
    
    # Validadores para documentos venezolanos
    cedula_validator = RegexValidator(
        regex=r'^[VE]-\d{7,8}$',
        message='La cédula debe tener el formato: V-12345678 o E-12345678'
    )
    
    rif_validator = RegexValidator(
        regex=r'^[JVEGPC]-\d{8}-\d$',
        message='El RIF debe tener el formato: V-12345678-9'
    )
    
    # ==========================================================================
    # DATOS PERSONALES
    # ==========================================================================
    
    first_name: models.CharField = models.CharField(
        max_length=100,
        verbose_name='Nombres'
    )
    
    last_name: models.CharField = models.CharField(
        max_length=100,
        verbose_name='Apellidos'
    )
    
    email: models.EmailField = models.EmailField(
        unique=True,
        verbose_name='Correo Electrónico'
    )
    
    phone: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Teléfono'
    )
    
    date_of_birth: models.DateField = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Nacimiento'
    )
    
    gender: models.CharField = models.CharField(
        max_length=1,
        choices=Gender.choices,
        blank=True,
        verbose_name='Género'
    )
    
    marital_status: models.CharField = models.CharField(
        max_length=1,
        choices=MaritalStatus.choices,
        blank=True,
        verbose_name='Estado Civil'
    )
    
    address: models.TextField = models.TextField(
        blank=True,
        verbose_name='Dirección'
    )
    
    # ==========================================================================
    # DOCUMENTOS VENEZUELA
    # ==========================================================================
    
    national_id: models.CharField = models.CharField(
        max_length=12,
        unique=True,
        validators=[cedula_validator],
        verbose_name='Cédula de Identidad',
        help_text='Formato: V-12345678 o E-12345678'
    )
    
    rif: models.CharField = models.CharField(
        max_length=12,
        unique=True,
        blank=True,
        null=True,
        validators=[rif_validator],
        verbose_name='RIF Personal',
        help_text='Registro de Información Fiscal (opcional)'
    )
    
    ivss_code: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Código IVSS',
        help_text='Número de afiliación al Instituto Venezolano de los Seguros Sociales'
    )
    
    faov_code: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Código FAOV/Banavih',
        help_text='Número de cuenta del Fondo de Ahorro Obligatorio para la Vivienda'
    )
    
    # ==========================================================================
    # DATOS LABORALES
    # ==========================================================================
    
    branch: models.ForeignKey = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name='Sede',
        help_text='Sede a la que pertenece el empleado'
    )
    
    employee_code: models.CharField = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        verbose_name='Código de Empleado',
        help_text='Código interno del empleado'
    )
    
    hire_date: models.DateField = models.DateField(
        verbose_name='Fecha de Ingreso',
        help_text='Fecha de inicio de la relación laboral (vital para antigüedad)'
    )
    
    termination_date: models.DateField = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Egreso',
        help_text='Fecha de terminación de la relación laboral'
    )
    
    is_active: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Activo',
        help_text='Indica si el empleado está actualmente laborando'
    )
    
    department: models.CharField = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Departamento'
    )
    
    position: models.CharField = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Cargo'
    )
    
    # ==========================================================================
    # DATOS BANCARIOS
    # ==========================================================================
    
    bank_name: models.CharField = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Banco'
    )
    
    bank_account_number: models.CharField = models.CharField(
        max_length=30,
        blank=True,
        verbose_name='Número de Cuenta',
        help_text='Cuenta para depósito de nómina'
    )
    
    bank_account_type: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Tipo de Cuenta',
        help_text='Ahorro o Corriente'
    )
    
    # ==========================================================================
    # METADATA
    # ==========================================================================
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    updated_at: models.DateTimeField = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )
    
    notes: models.TextField = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['national_id']),
            models.Index(fields=['is_active']),
            models.Index(fields=['hire_date']),
        ]
    
    def __str__(self) -> str:
        """Representación en string del empleado."""
        return f"{self.last_name}, {self.first_name} ({self.national_id})"
    
    @property
    def full_name(self) -> str:
        """Retorna el nombre completo del empleado."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def seniority_years(self) -> int:
        """
        Calcula los años de antigüedad del empleado.
        """
        if not self.hire_date:
            return 0
        
        end_date = self.termination_date or timezone.now().date()
        delta = end_date - self.hire_date
        return delta.days // 365
    
    @property
    def seniority_days(self) -> int:
        """
        Calcula los días totales de antigüedad.
        """
        if not self.hire_date:
            return 0
        
        end_date = self.termination_date or timezone.now().date()
        delta = end_date - self.hire_date
        return delta.days


class LaborContract(models.Model):
    """
    Modelo de Contrato Laboral.
    """
    
    class PaymentFrequency(models.TextChoices):
        """Frecuencia de pago del salario."""
        WEEKLY = 'WEEKLY', 'Semanal'
        BIWEEKLY = 'BIWEEKLY', 'Quincenal'
        MONTHLY = 'MONTHLY', 'Mensual'
    
    class ContractType(models.TextChoices):
        """Tipo de contrato laboral."""
        INDEFINITE = 'INDEFINITE', 'Tiempo Indeterminado'
        FIXED_TERM = 'FIXED_TERM', 'Tiempo Determinado'
        PROJECT = 'PROJECT', 'Por Obra Determinada'
    
    employee: models.ForeignKey = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='contracts',
        verbose_name='Empleado'
    )
    
    branch: models.ForeignKey = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='contracts',
        verbose_name='Sede',
        help_text='Sede donde se ejecuta el contrato'
    )
    
    contract_type: models.CharField = models.CharField(
        max_length=20,
        choices=ContractType.choices,
        default=ContractType.INDEFINITE,
        verbose_name='Tipo de Contrato'
    )
    
    # ==========================================================================
    # INFORMACIÓN SALARIAL
    # ==========================================================================
    
    salary_amount: models.DecimalField = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Monto del Salario',
        help_text='Monto del salario en la moneda especificada'
    )
    
    salary_currency: models.ForeignKey = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='contracts',
        verbose_name='Moneda del Salario',
        help_text='Moneda en la que se pacta el salario (generalmente USD)'
    )
    
    payment_frequency: models.CharField = models.CharField(
        max_length=10,
        choices=PaymentFrequency.choices,
        default=PaymentFrequency.BIWEEKLY,
        verbose_name='Frecuencia de Pago'
    )
    
    # ==========================================================================
    # FECHAS DEL CONTRATO
    # ==========================================================================
    
    start_date: models.DateField = models.DateField(
        verbose_name='Fecha de Inicio',
        help_text='Fecha de inicio del contrato'
    )
    
    end_date: models.DateField = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Fin',
        help_text='Solo para contratos a tiempo determinado'
    )
    
    # ==========================================================================
    # ESTADO
    # ==========================================================================
    
    is_active: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='Vigente',
        help_text='Indica si este es el contrato actual del empleado'
    )
    
    # ==========================================================================
    # INFORMACIÓN ADICIONAL
    # ==========================================================================
    
    position: models.CharField = models.CharField(
        max_length=100,
        verbose_name='Cargo',
        help_text='Cargo según el contrato'
    )
    
    department: models.CharField = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Departamento'
    )
    
    work_schedule: models.CharField = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Horario de Trabajo',
        help_text='Ej: Lunes a Viernes 8:00 AM - 5:00 PM'
    )
    
    notes: models.TextField = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    # ==========================================================================
    # METADATA
    # ==========================================================================
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    updated_at: models.DateTimeField = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )
    
    class Meta:
        verbose_name = 'Contrato Laboral'
        verbose_name_plural = 'Contratos Laborales'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['employee', '-start_date']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self) -> str:
        """Representación en string del contrato."""
        status = "Vigente" if self.is_active else "Inactivo"
        return f"{self.employee.full_name} - {self.position} ({status})"
    
    @property
    def monthly_salary(self) -> Decimal:
        """
        Calcula el salario mensual equivalent basado en la frecuencia.
        """
        if self.payment_frequency == self.PaymentFrequency.WEEKLY:
            return self.salary_amount * Decimal('4.33')  # Promedio semanas/mes
        elif self.payment_frequency == self.PaymentFrequency.BIWEEKLY:
            return self.salary_amount * Decimal('2')
        else:  # MONTHLY
            return self.salary_amount
    
    def save(self, *args, **kwargs) -> None:
        """
        Al activar un contrato, desactiva los demás del mismo empleado.
        """
        if self.is_active and self.employee_id:
            # Desactivar otros contratos del mismo empleado
            self.__class__.objects.filter(
                employee_id=self.employee_id,
                is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        
        super().save(*args, **kwargs)

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
        """Método de cálculo del concepto."""
        FIXED_AMOUNT = 'FIXED_AMOUNT', 'Monto Fijo'
        PERCENTAGE_OF_BASIC = 'PERCENTAGE_OF_BASIC', 'Porcentaje del Salario Base'
        FORMULA = 'FORMULA', 'Fórmula Compleja'
    
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
    
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    class Meta:
        verbose_name = 'Concepto de Nómina'
        verbose_name_plural = 'Conceptos de Nómina'
        ordering = ['kind', 'code']
    
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
        # Nota: La restricción de no solapamiento se puede implementar con un CheckConstraint 
        # o validación en el clean() / save() del modelo.

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class Payslip(models.Model):
    """
    Cabecera de Recibo de Pago (Inmutable después del cierre).
    Almacena el resultado final y un snapshot del contrato.
    """
    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.PROTECT,
        related_name='payslips',
        verbose_name='Periodo'
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='payslips',
        verbose_name='Empleado'
    )
    
    class PayslipStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Borrador'
        PAID = 'PAID', 'Pagado'

    # Snapshot del contrato al momento del cierre
    contract_snapshot = models.JSONField(
        verbose_name='Snapshot del Contrato',
        help_text='Copia de los datos del contrato (salario, cargo, etc.) al cerrar'
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
        choices=PayslipStatus.choices,
        default=PayslipStatus.DRAFT,
        verbose_name='Estado del Recibo'
    )

    # Datos de Auditoría (Tasa y Moneda usada)
    exchange_rate_applied = models.DecimalField(
        max_digits=18, decimal_places=6,
        default=Decimal('1.000000'),
        verbose_name='Tasa Aplicada',
        help_text='Tasa BCV utilizada para este recibo'
    )
    currency_code = models.CharField(
        max_length=3,
        default='VES',
        verbose_name='Moneda del Recibo',
        help_text='Generalmente VES'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Recibo de Pago'
        verbose_name_plural = 'Recibos de Pago'
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


class PayslipDetail(models.Model):
    """
    Renglones Detallados de un Recibo.
    Contiene la copia de los datos del concepto para evitar pérdida de información histórica.
    """
    payslip = models.ForeignKey(
        Payslip,
        on_delete=models.CASCADE,
        related_name='details',
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
    amount_src = models.DecimalField(
        max_digits=18, decimal_places=4,
        null=True, blank=True,
        verbose_name='Monto Original'
    )
    
    notes = models.TextField(blank=True, verbose_name='Notas')

    class Meta:
        verbose_name = 'Detalle de Recibo'
        verbose_name_plural = 'Detalles de Recibo'

    def __str__(self):
        return f"{self.concept_code}: {self.amount}"

