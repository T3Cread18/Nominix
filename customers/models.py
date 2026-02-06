"""
Modelos de la app Customers - Esquema Public.

Define los modelos para gestión de multi-tenancy:
- Client: Representa a cada farmacia/empresa (inquilino)
- Domain: Representa los dominios asociados a cada inquilino
"""
from django.db import models
from django.core.validators import RegexValidator
from django_tenants.models import TenantMixin, DomainMixin
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from decimal import Decimal
from typing import Optional


class Client(TenantMixin):
    """
    Modelo de Cliente/Inquilino.
    
    Representa a cada farmacia o empresa que utiliza el sistema.
    Hereda de TenantMixin para integración con django-tenants.
    
    Cada Client genera un esquema separado en PostgreSQL donde
    se almacenan sus datos de nómina y empleados.
    
    Attributes:
        name: Nombre de la farmacia/empresa
        rif: Registro de Información Fiscal (formato venezolano)
        created_on: Fecha de creación del inquilino
        paid_until: Fecha hasta la cual está pagada la suscripción
        on_trial: Indica si el cliente está en período de prueba
    """
    
    # Validador para RIF venezolano: J-12345678-9, V-12345678-9, etc.
    rif_validator = RegexValidator(
        regex=r'^[JVEGPC]-\d{8}-\d$',
        message='El RIF debe tener el formato: X-12345678-9 (donde X es J, V, E, G, P o C)'
    )
    
    name: models.CharField = models.CharField(
        max_length=200,
        verbose_name='Nombre de la Empresa',
        help_text='Nombre comercial o razón social de la farmacia'
    )
    
    rif: models.CharField = models.CharField(
        max_length=12,
        unique=True,
        validators=[rif_validator],
        verbose_name='RIF',
        help_text='Registro de Información Fiscal (ej: J-12345678-9)'
    )
    
    created_on: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Registro'
    )
    
    # Campos para gestión de suscripción
    paid_until: models.DateField = models.DateField(
        null=True,
        blank=True,
        verbose_name='Pagado Hasta',
        help_text='Fecha de vencimiento de la suscripción'
    )
    
    on_trial: models.BooleanField = models.BooleanField(
        default=True,
        verbose_name='En Período de Prueba'
    )

    price_per_employee: models.DecimalField = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name='Precio por Empleado ($)',
        help_text='Costo mensual por empleado activo'
    )
    
    # Información de contacto
    email: models.EmailField = models.EmailField(
        blank=True,
        verbose_name='Email de Contacto'
    )
    
    phone: models.CharField = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Teléfono',
        help_text='Número de teléfono de contacto'
    )
    
    address: models.TextField = models.TextField(
        blank=True,
        verbose_name='Dirección',
        help_text='Dirección fiscal de la empresa'
    )
    
    # El campo auto_create_schema determina si se crea automáticamente
    # el esquema en PostgreSQL al crear un nuevo Client
    auto_create_schema: bool = True
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['name']
    
    def __str__(self) -> str:
        """Representación en string del cliente."""
        return f"{self.name} ({self.rif})"
    
    def get_schema_name(self) -> str:
        """
        Retorna el nombre del esquema en PostgreSQL.
        Se genera automáticamente basado en el schema_name de TenantMixin.
        """
        return self.schema_name


class Domain(DomainMixin):
    """
    Modelo de Dominio.
    
    Asocia dominios/subdominios a cada inquilino.
    Permite que cada farmacia acceda al sistema desde su propio subdominio.
    
    Ejemplo:
        - farmacia-central.rrhh-vzla.com
        - farmacia-los-andes.rrhh-vzla.com
    
    Attributes:
        domain: El dominio completo (ej: farmacia.example.com)
        tenant: Referencia al Client/inquilino
        is_primary: Indica si es el dominio principal del inquilino
    """
    
    class Meta:
        verbose_name = 'Dominio'
        verbose_name_plural = 'Dominios'
    
    def __str__(self) -> str:
        """Representación en string del dominio."""
        return self.domain


# =============================================================================
# MONETARY MODELS (SHARED GLOBALLY)
# =============================================================================

class Currency(models.Model):
    """
    Modelo de Moneda (Esquema Público).
    """
    code = models.CharField(
        max_length=3,
        primary_key=True,
        verbose_name='Código',
        help_text='Código ISO de 3 letras (ej: USD, VES, EUR)'
    )
    name = models.CharField(max_length=50, verbose_name='Nombre')
    symbol = models.CharField(max_length=5, default='$', verbose_name='Símbolo')
    is_base_currency = models.BooleanField(default=False, verbose_name='Es Moneda Base')
    is_active = models.BooleanField(default=True, verbose_name='Activa')
    decimal_places = models.PositiveSmallIntegerField(default=2, verbose_name='Decimales')

    class Meta:
        verbose_name = 'Moneda'
        verbose_name_plural = 'Monedas'
        ordering = ['code']

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    def save(self, *args, **kwargs) -> None:
        if self.is_base_currency:
            Currency.objects.filter(is_base_currency=True).update(is_base_currency=False)
        super().save(*args, **kwargs)


class ExchangeRate(models.Model):
    """
    Modelo de Tasa de Cambio (Esquema Público).
    """
    class RateSource(models.TextChoices):
        BCV = 'BCV', 'Banco Central de Venezuela'
        MONITOR = 'MONITOR', 'Monitor Dólar'
        PARALELO = 'PARALELO', 'Mercado Paralelo'
        PROMEDIO = 'PROMEDIO', 'Promedio de Mercado'

    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='exchange_rates',
        verbose_name='Moneda'
    )
    rate = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        validators=[MinValueValidator(Decimal('0.000001'))],
        verbose_name='Tasa'
    )
    date_valid = models.DateTimeField(verbose_name='Fecha de Validez')
    source = models.CharField(
        max_length=20,
        choices=RateSource.choices,
        default=RateSource.BCV,
        verbose_name='Fuente'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Registro')
    notes = models.TextField(blank=True, verbose_name='Notas')

    class Meta:
        verbose_name = 'Tasa de Cambio'
        verbose_name_plural = 'Tasas de Cambio'
        ordering = ['-date_valid']
        unique_together = ['currency', 'date_valid', 'source']
        indexes = [
            models.Index(fields=['currency', '-date_valid']),
            models.Index(fields=['source', '-date_valid']),
        ]

    def __str__(self) -> str:
        return f"{self.currency.code}: {self.rate} VES ({self.source} - {self.date_valid.strftime('%d/%m/%Y %H:%M')})"


class InterestRateBCV(models.Model):
    """
    Tasa de interés mensual publicada por el BCV para Prestaciones Sociales (Esquema Público).
    """
    year = models.PositiveIntegerField(verbose_name='Año')
    month = models.PositiveIntegerField(
        verbose_name='Mes',
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    rate = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        verbose_name='Tasa (%)'
    )
    source_url = models.URLField(blank=True, verbose_name='URL Fuente BCV')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=100, verbose_name='Creado por')

    class Meta:
        verbose_name = 'Tasa BCV'
        verbose_name_plural = 'Tasas BCV'
        unique_together = ['year', 'month']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.year}-{self.month:02d}: {self.rate}%"
