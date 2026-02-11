"""
Modelos de empleados y contratos laborales.
"""
from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
from decimal import Decimal

from .base import tenant_upload_path
from .organization import Branch, Department, JobPosition
from .work_schedule import WorkSchedule
from customers.models import Currency


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
        verbose_name='Correo Electrónico',
        null=True,
        blank=True,
    )
    
    phone: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        null=True,
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
    
    photo = models.ImageField(
        upload_to=tenant_upload_path, 
        null=True, 
        blank=True
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
        blank=True,
        null=True,
        validators=[rif_validator],
        verbose_name='RIF Personal',
        help_text='Registro de Información Fiscal (opcional)'
    )
    
    ivss_code: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Código IVSS',
        help_text='Número de afiliación al Instituto Venezolano de los Seguros Sociales'
    )
    
    faov_code: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        null=True,  
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
    
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name='Departamento',
        help_text='Departamento al que pertenece el empleado'
    )
    
    position: models.CharField = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Cargo (Texto Legacy)'
    )
    
    job_position = models.ForeignKey(
        JobPosition,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name='Cargo Estructurado',
        help_text='Cargo asociado de la estructura organizacional'
    )

    work_schedule = models.ForeignKey(
        WorkSchedule,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name='Horario de Trabajo',
        help_text='Horario asignado para cálculo de asistencia'
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
        null=True,
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

    @property
    def seniority_months(self) -> int:
        """
        Calcula los meses restantes de antigüedad después de los años completos.
        """
        if not self.hire_date:
            return 0
        
        total_days = self.seniority_days
        remaining_days = total_days % 365
        return remaining_days // 30


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
    
    base_salary_bs = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Sueldo Base en Bolívares (Fijo)"
    )
    
    includes_cestaticket = models.BooleanField(default=True)
    
    contract_type: models.CharField = models.CharField(
        max_length=20,
        choices=ContractType.choices,
        default=ContractType.INDEFINITE,
        verbose_name='Tipo de Contrato'
    )
    
    # ==========================================================================
    # CARGO Y JERARQUÍA
    # ==========================================================================
    
    job_position = models.ForeignKey(
        JobPosition,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='contracts',
        verbose_name='Cargo Estructurado',
        help_text='Cargo seleccionado de la estructura organizacional'
    )
    
    total_salary_override = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Override Sueldo Mensual',
        help_text='Si se define, sobreescribe el sueldo base del cargo. (Monto Mensual)'
    )
    
    # ==========================================================================
    # INFORMACIÓN SALARIAL
    # ==========================================================================
    
    islr_retention_percentage: models.DecimalField = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name='Porcentaje de Retención de ISLR',
        help_text='Porcentaje de retención de ISLR'
    )
    
    salary_amount: models.DecimalField = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Monto del Salario',
        help_text="Total Paquete Mensual en USD"
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
        null=True,
        blank=True,
        help_text='Cargo según el contrato'
    )
    
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name='Departamento',
        help_text='Departamento según el contrato'
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
        Calcula el salario mensual personal (base + complementos fijos).
        Prioridad: Override -> Sueldo del Contrato (Mensual) -> Cargo
        """
        # 1. Override manual (si existe)
        if self.total_salary_override is not None:
            return self.total_salary_override
            
        # 2. Monto pactado en contrato (se especifica siempre en mensualidad)
        if self.salary_amount > 0:
            return self.salary_amount

        # 3. Por defecto del cargo (si existe)
        if self.job_position and self.job_position.default_total_salary > 0:
            return self.job_position.default_total_salary
            
        return Decimal('0.00')
    
    def save(self, *args, **kwargs) -> None:
        """
        Al activar un contrato, desactiva los demás del mismo empleado.
        """
        if self.is_active:
            LaborContract.objects.filter(
                employee=self.employee, 
                is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
            
            # Sync Employee Department and Position
            self.employee.position = self.position
            self.employee.department = self.department
            self.employee.save()
            
        # Sincronización de campos legacy y defaults
        if self.job_position:
            # 1. Copiar nombre del cargo al campo legacy
            self.position = self.job_position.name
            
            # 2. Copiar departamento si no está definido manualmente
            if not self.department:
                self.department = self.job_position.department
        
        super().save(*args, **kwargs)
