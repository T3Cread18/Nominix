"""
Modelos de estructura organizacional: Sedes, Departamentos, Empresa.
"""
from django.db import models
from decimal import Decimal


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
        ordering = ['name']
    
    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


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
    
    class Meta:
        verbose_name = 'Departamento'
        verbose_name_plural = 'Departamentos'
        ordering = ['name']
    
    def __str__(self) -> str:
        return self.name


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

    class Meta:
        verbose_name = "Configuración de Empresa"
        verbose_name_plural = "Configuración de Empresa"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Garantizar que solo haya 1 registro (Singleton pattern simple)
        if not self.pk and Company.objects.exists():
            raise Exception("Solo puede haber una configuración de empresa.")
        super().save(*args, **kwargs)
