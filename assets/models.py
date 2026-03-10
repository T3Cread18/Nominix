"""
Modelos del módulo de Activos Fijos y Mobiliario.

Jerarquía:
    Branch (Sede) → Warehouse (Almacén) → Asset (Activo)
    AssetCategory (Categoría, jerárquica)
    AssetMovement (Traslados entre almacenes/sedes)
    AssetDepreciation (Cálculos periódicos)
    AssetPhoto (Fotos + metadata OCR)
    AssetInvoice (Factura de adquisición)
    AssetAudit / AssetAuditItem (Auditoría física)
"""
from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from decimal import Decimal


# ─── Categoría de Activos ──────────────────────────
class AssetCategory(models.Model):
    """
    Categoría jerárquica para clasificar activos.
    Ejemplos: Mobiliario > Escritorios,  IT > Laptops
    """
    name = models.CharField(max_length=100, verbose_name='Nombre')
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Categoría padre'
    )
    description = models.TextField(blank=True, default='', verbose_name='Descripción')
    useful_life_years = models.PositiveIntegerField(
        default=5,
        verbose_name='Vida útil (años)',
        help_text='Vida útil predeterminada para activos de esta categoría'
    )
    depreciation_method = models.CharField(
        max_length=20,
        choices=[
            ('STRAIGHT_LINE', 'Línea Recta'),
            ('DECLINING_BALANCE', 'Saldos Decrecientes'),
            ('UNITS_OF_PRODUCTION', 'Unidades de Producción'),
        ],
        default='STRAIGHT_LINE',
        verbose_name='Método de depreciación'
    )
    is_active = models.BooleanField(default=True, verbose_name='Activa')

    class Meta:
        verbose_name = 'Categoría de Activo'
        verbose_name_plural = 'Categorías de Activos'
        ordering = ['name']

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name

    @property
    def full_path(self):
        """Retorna la ruta completa: Padre > Hijo > Nieto"""
        parts = [self.name]
        current = self.parent
        while current:
            parts.insert(0, current.name)
            current = current.parent
        return ' > '.join(parts)


# ─── Almacén ──────────────────────────
class Warehouse(models.Model):
    """
    Almacén o ubicación de almacenamiento dentro de una sede.
    Cada sede puede tener múltiples almacenes.
    """
    name = models.CharField(max_length=100, verbose_name='Nombre')
    branch = models.ForeignKey(
        'payroll_core.Branch',
        on_delete=models.CASCADE,
        related_name='warehouses',
        verbose_name='Sede'
    )
    address = models.TextField(blank=True, default='', verbose_name='Dirección')
    description = models.TextField(blank=True, default='', verbose_name='Descripción')
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Almacén'
        verbose_name_plural = 'Almacenes'
        ordering = ['branch', 'name']
        unique_together = ['branch', 'name']

    def __str__(self):
        return f"{self.branch.name} — {self.name}"


# ─── Factura de Adquisición ──────────────────────────
class AssetInvoice(models.Model):
    """
    Factura de compra vinculada a activos.
    Permite agrupar múltiples activos bajo una misma factura.
    """
    invoice_number = models.CharField(max_length=50, verbose_name='Número de factura')
    vendor_name = models.CharField(max_length=200, verbose_name='Proveedor')
    vendor_rif = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name='RIF del Proveedor'
    )
    invoice_date = models.DateField(verbose_name='Fecha de factura')
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Monto total'
    )
    currency = models.CharField(max_length=3, default='USD', verbose_name='Moneda')
    notes = models.TextField(blank=True, default='', verbose_name='Notas')
    document = models.FileField(
        upload_to='assets/invoices/',
        blank=True,
        null=True,
        verbose_name='Documento adjunto'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Factura de Adquisición'
        verbose_name_plural = 'Facturas de Adquisición'
        ordering = ['-invoice_date']

    def __str__(self):
        return f"Fact. {self.invoice_number} — {self.vendor_name}"


# ─── Activo Fijo ──────────────────────────
class Asset(models.Model):
    """
    Activo fijo individual: mobiliario, equipo, vehículo, etc.
    """
    DEPRECIATION_METHODS = [
        ('STRAIGHT_LINE', 'Línea Recta'),
        ('DECLINING_BALANCE', 'Saldos Decrecientes'),
        ('UNITS_OF_PRODUCTION', 'Unidades de Producción'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Activo'),
        ('MAINTENANCE', 'En Mantenimiento'),
        ('DISPOSED', 'Dado de Baja'),
        ('TRANSFERRED', 'En Tránsito'),
    ]

    # ── Identificación ──
    code = models.CharField(
        max_length=30,
        unique=True,
        verbose_name='Código interno',
        help_text='Código único del activo (auto-generado o manual)'
    )
    serial_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Número de serie',
        help_text='Extraído por OCR o ingresado manualmente'
    )
    name = models.CharField(max_length=200, verbose_name='Nombre del activo')
    description = models.TextField(blank=True, default='', verbose_name='Descripción')
    barcode = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Código de barras / QR'
    )

    # ── Clasificación ──
    category = models.ForeignKey(
        AssetCategory,
        on_delete=models.PROTECT,
        related_name='assets',
        verbose_name='Categoría'
    )
    brand = models.CharField(max_length=100, blank=True, default='', verbose_name='Marca')
    model_name = models.CharField(max_length=100, blank=True, default='', verbose_name='Modelo')

    # ── Ubicación actual ──
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='assets',
        verbose_name='Almacén actual'
    )
    custodian = models.ForeignKey(
        'payroll_core.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_assets',
        verbose_name='Custodio / Responsable'
    )

    # ── Financiero ──
    invoice = models.ForeignKey(
        AssetInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets',
        verbose_name='Factura de adquisición'
    )
    acquisition_date = models.DateField(verbose_name='Fecha de adquisición')
    acquisition_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Costo de adquisición'
    )
    currency = models.CharField(max_length=3, default='USD', verbose_name='Moneda')
    useful_life_years = models.PositiveIntegerField(
        default=5,
        verbose_name='Vida útil (años)'
    )
    residual_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Valor residual'
    )
    current_book_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Valor neto en libros',
        help_text='Se actualiza automáticamente al calcular depreciación'
    )
    depreciation_method = models.CharField(
        max_length=20,
        choices=DEPRECIATION_METHODS,
        default='STRAIGHT_LINE',
        verbose_name='Método de depreciación'
    )

    # ── Estado ──
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='ACTIVE',
        verbose_name='Estado'
    )

    # ── Auditoría ──
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_assets',
        verbose_name='Creado por'
    )

    class Meta:
        verbose_name = 'Activo Fijo'
        verbose_name_plural = 'Activos Fijos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['serial_number']),
            models.Index(fields=['status']),
            models.Index(fields=['warehouse']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"[{self.code}] {self.name}"

    def save(self, *args, **kwargs):
        # Auto-generar código si está vacío
        if not self.code:
            self.code = self._generate_code()
        # Inicializar valor en libros con costo de adquisición
        if self.current_book_value is None:
            self.current_book_value = self.acquisition_cost
        super().save(*args, **kwargs)

    def _generate_code(self):
        """Genera un código incremental: AF-0001, AF-0002..."""
        last = Asset.objects.order_by('-id').first()
        next_num = (last.id + 1) if last else 1
        return f"AF-{next_num:04d}"

    @property
    def branch(self):
        """Sede del activo (a través del almacén)."""
        return self.warehouse.branch if self.warehouse else None

    @property
    def accumulated_depreciation(self):
        """Depreciación acumulada: costo - valor actual."""
        return self.acquisition_cost - self.current_book_value


# ─── Foto de Activo ──────────────────────────
class AssetPhoto(models.Model):
    """
    Foto de un activo con metadata de OCR.
    """
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Activo'
    )
    image = models.ImageField(
        upload_to='assets/photos/%Y/%m/',
        verbose_name='Imagen'
    )
    is_primary = models.BooleanField(default=False, verbose_name='Foto principal')
    ocr_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Datos OCR',
        help_text='Resultado del procesamiento OCR de esta imagen'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Foto de Activo'
        verbose_name_plural = 'Fotos de Activos'
        ordering = ['-is_primary', '-uploaded_at']

    def __str__(self):
        return f"Foto de {self.asset.code}"


# ─── Movimientos entre Almacenes/Sedes ──────────────────────────
class AssetMovement(models.Model):
    """
    Registro de traslado de activos entre almacenes/sedes.
    Equivale a una guía de remisión.
    """
    TRANSPORT_TYPES = [
        ('PRIVATE', 'Transporte Privado'),
        ('PUBLIC', 'Transporte Público'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Borrador'),
        ('IN_TRANSIT', 'En Tránsito'),
        ('RECEIVED', 'Recibido'),
        ('CANCELLED', 'Cancelado'),
    ]

    # ── Guía ──
    guide_number = models.CharField(
        max_length=30,
        unique=True,
        verbose_name='Número de guía'
    )
    reason = models.CharField(
        max_length=200,
        default='Traslado entre establecimientos de la misma empresa',
        verbose_name='Motivo del traslado'
    )

    # ── Origen / Destino ──
    origin_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='outgoing_movements',
        verbose_name='Almacén origen'
    )
    destination_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='incoming_movements',
        verbose_name='Almacén destino'
    )

    # ── Activos trasladados ──
    assets = models.ManyToManyField(
        Asset,
        related_name='movements',
        verbose_name='Activos'
    )

    # ── Transporte ──
    transport_type = models.CharField(
        max_length=10,
        choices=TRANSPORT_TYPES,
        default='PRIVATE',
        verbose_name='Tipo de transporte'
    )
    vehicle_plate = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name='Placa del vehículo'
    )
    driver_name = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Nombre del conductor'
    )
    driver_id = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name='Cédula del conductor'
    )

    # ── Estado y control ──
    status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default='DRAFT',
        verbose_name='Estado'
    )
    notes = models.TextField(blank=True, default='', verbose_name='Observaciones')

    # ── Trazabilidad ──
    dispatched_at = models.DateTimeField(null=True, blank=True, verbose_name='Despachado el')
    dispatched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatched_movements',
        verbose_name='Despachado por'
    )
    received_at = models.DateTimeField(null=True, blank=True, verbose_name='Recibido el')
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_movements',
        verbose_name='Recibido por'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimiento de Activos'
        verbose_name_plural = 'Movimientos de Activos'
        ordering = ['-created_at']

    def __str__(self):
        return f"Guía {self.guide_number}: {self.origin_warehouse} → {self.destination_warehouse}"

    def save(self, *args, **kwargs):
        if not self.guide_number:
            self.guide_number = self._generate_guide_number()
        super().save(*args, **kwargs)

    def _generate_guide_number(self):
        from django.utils import timezone
        today = timezone.now()
        prefix = f"GR-{today.strftime('%Y%m')}"
        last = AssetMovement.objects.filter(
            guide_number__startswith=prefix
        ).order_by('-guide_number').first()
        if last:
            seq = int(last.guide_number.split('-')[-1]) + 1
        else:
            seq = 1
        return f"{prefix}-{seq:04d}"


# ─── Depreciación de Activo ──────────────────────────
class AssetDepreciation(models.Model):
    """
    Registro de cálculo de depreciación periódica.
    """
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='depreciation_records',
        verbose_name='Activo'
    )
    period_date = models.DateField(verbose_name='Fecha del período')
    method = models.CharField(max_length=20, verbose_name='Método aplicado')
    depreciation_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Monto depreciado'
    )
    book_value_before = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Valor antes'
    )
    book_value_after = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name='Valor después'
    )
    calculated_at = models.DateTimeField(auto_now_add=True)
    calculated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Calculado por'
    )

    class Meta:
        verbose_name = 'Depreciación'
        verbose_name_plural = 'Depreciaciones'
        ordering = ['-period_date']
        unique_together = ['asset', 'period_date']

    def __str__(self):
        return f"{self.asset.code} — {self.period_date}: -{self.depreciation_amount}"


# ─── Auditoría de Inventario ──────────────────────────
class AssetAudit(models.Model):
    """
    Sesión de auditoría física de activos en un almacén.
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'En Progreso'),
        ('COMPLETED', 'Completada'),
        ('CANCELLED', 'Cancelada'),
    ]

    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name='audits',
        verbose_name='Almacén auditado'
    )
    name = models.CharField(max_length=100, verbose_name='Nombre de la auditoría')
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS',
        verbose_name='Estado'
    )
    notes = models.TextField(blank=True, default='', verbose_name='Observaciones')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Realizada por'
    )

    # Resultados
    total_expected = models.PositiveIntegerField(default=0, verbose_name='Total esperados')
    total_found = models.PositiveIntegerField(default=0, verbose_name='Total encontrados')
    total_missing = models.PositiveIntegerField(default=0, verbose_name='Faltantes')
    total_surplus = models.PositiveIntegerField(default=0, verbose_name='Sobrantes')

    class Meta:
        verbose_name = 'Auditoría de Inventario'
        verbose_name_plural = 'Auditorías de Inventario'
        ordering = ['-started_at']

    def __str__(self):
        return f"Auditoría: {self.name} — {self.warehouse}"


class AssetAuditItem(models.Model):
    """
    Ítem individual verificado durante una auditoría.
    """
    RESULT_CHOICES = [
        ('FOUND', 'Encontrado'),
        ('MISSING', 'Faltante'),
        ('SURPLUS', 'Sobrante'),
        ('DAMAGED', 'Dañado'),
    ]

    audit = models.ForeignKey(
        AssetAudit,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Auditoría'
    )
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='audit_items',
        verbose_name='Activo'
    )
    result = models.CharField(
        max_length=10,
        choices=RESULT_CHOICES,
        verbose_name='Resultado'
    )
    notes = models.TextField(blank=True, default='', verbose_name='Observaciones')
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ítem de Auditoría'
        verbose_name_plural = 'Ítems de Auditoría'
        ordering = ['-scanned_at']

    def __str__(self):
        asset_code = self.asset.code if self.asset else 'N/A'
        return f"{asset_code} — {self.get_result_display()}"
