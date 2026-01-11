"""
Modelos relacionados con monedas y tasas de cambio.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


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
