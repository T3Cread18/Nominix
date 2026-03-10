"""
Serializers para el módulo de Activos Fijos.
"""
from rest_framework import serializers
from django.db.models import Sum
from .models import (
    AssetCategory,
    Warehouse,
    Asset,
    AssetPhoto,
    AssetInvoice,
    AssetMovement,
    AssetDepreciation,
    AssetAudit,
    AssetAuditItem,
)


# ─── Categorías ──────────────────────────
class AssetCategorySerializer(serializers.ModelSerializer):
    full_path = serializers.ReadOnlyField()
    parent_name = serializers.CharField(source='parent.name', read_only=True, default=None)
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = AssetCategory
        fields = [
            'id', 'name', 'parent', 'parent_name', 'full_path',
            'description', 'useful_life_years', 'depreciation_method',
            'is_active', 'asset_count',
        ]

    def get_asset_count(self, obj):
        return obj.assets.count()


# ─── Almacenes ──────────────────────────
class WarehouseSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    asset_count = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            'id', 'name', 'branch', 'branch_name',
            'address', 'description', 'is_active',
            'asset_count', 'total_value',
            'created_at', 'updated_at',
        ]

    def get_asset_count(self, obj):
        return obj.assets.filter(status='ACTIVE').count()

    def get_total_value(self, obj):
        agg = obj.assets.filter(status='ACTIVE').aggregate(
            total=Sum('current_book_value')
        )
        return float(agg['total'] or 0)


# ─── Facturas ──────────────────────────
class AssetInvoiceSerializer(serializers.ModelSerializer):
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = AssetInvoice
        fields = [
            'id', 'invoice_number', 'vendor_name', 'vendor_rif',
            'invoice_date', 'total_amount', 'currency', 'notes',
            'document', 'asset_count', 'created_at',
        ]

    def get_asset_count(self, obj):
        return obj.assets.count()


# ─── Fotos ──────────────────────────
class AssetPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetPhoto
        fields = ['id', 'asset', 'image', 'is_primary', 'ocr_data', 'uploaded_at']
        read_only_fields = ['uploaded_at', 'ocr_data']


# ─── Activos (Lista) ──────────────────────────
class AssetListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    branch_name = serializers.SerializerMethodField()
    custodian_name = serializers.SerializerMethodField()
    primary_photo = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'code', 'name', 'serial_number', 'brand', 'model_name',
            'category', 'category_name',
            'warehouse', 'warehouse_name', 'branch_name',
            'custodian', 'custodian_name',
            'acquisition_date', 'acquisition_cost', 'current_book_value',
            'currency', 'status', 'primary_photo',
        ]

    def get_branch_name(self, obj):
        return obj.warehouse.branch.name if obj.warehouse else None

    def get_custodian_name(self, obj):
        if obj.custodian:
            return f"{obj.custodian.first_name} {obj.custodian.last_name}"
        return None

    def get_primary_photo(self, obj):
        photo = obj.photos.filter(is_primary=True).first()
        if photo and photo.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(photo.image.url)
            return photo.image.url
        return None


# ─── Activos (Detalle) ──────────────────────────
class AssetDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para la ficha del activo."""
    category_name = serializers.CharField(source='category.full_path', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    branch_name = serializers.SerializerMethodField()
    custodian_name = serializers.SerializerMethodField()
    photos = AssetPhotoSerializer(many=True, read_only=True)
    accumulated_depreciation = serializers.ReadOnlyField()
    invoice_detail = AssetInvoiceSerializer(source='invoice', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'code', 'name', 'serial_number', 'description', 'barcode',
            'brand', 'model_name',
            'category', 'category_name',
            'warehouse', 'warehouse_name', 'branch_name',
            'custodian', 'custodian_name',
            'invoice', 'invoice_detail',
            'acquisition_date', 'acquisition_cost', 'currency',
            'useful_life_years', 'residual_value',
            'current_book_value', 'accumulated_depreciation',
            'depreciation_method', 'status',
            'photos', 'created_at', 'updated_at',
            'created_by', 'created_by_name',
        ]
        read_only_fields = ['code', 'current_book_value', 'created_at', 'updated_at', 'created_by']

    def get_branch_name(self, obj):
        return obj.warehouse.branch.name if obj.warehouse else None

    def get_custodian_name(self, obj):
        if obj.custodian:
            return f"{obj.custodian.first_name} {obj.custodian.last_name}"
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        # Inicializar valor en libros = costo de adquisición
        if 'current_book_value' not in validated_data:
            validated_data['current_book_value'] = validated_data.get('acquisition_cost', 0)
        return super().create(validated_data)


# ─── Movimientos ──────────────────────────
class AssetMovementSerializer(serializers.ModelSerializer):
    origin_warehouse_name = serializers.CharField(
        source='origin_warehouse.name', read_only=True
    )
    origin_branch_name = serializers.SerializerMethodField()
    destination_warehouse_name = serializers.CharField(
        source='destination_warehouse.name', read_only=True
    )
    destination_branch_name = serializers.SerializerMethodField()
    asset_count = serializers.SerializerMethodField()
    dispatched_by_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()
    asset_details = AssetListSerializer(source='assets', many=True, read_only=True)

    class Meta:
        model = AssetMovement
        fields = [
            'id', 'guide_number', 'reason',
            'origin_warehouse', 'origin_warehouse_name', 'origin_branch_name',
            'destination_warehouse', 'destination_warehouse_name', 'destination_branch_name',
            'assets', 'asset_details', 'asset_count',
            'transport_type', 'vehicle_plate', 'driver_name', 'driver_id',
            'status', 'notes',
            'dispatched_at', 'dispatched_by', 'dispatched_by_name',
            'received_at', 'received_by', 'received_by_name',
            'created_at',
        ]
        read_only_fields = [
            'guide_number', 'dispatched_at', 'dispatched_by',
            'received_at', 'received_by', 'created_at',
        ]

    def get_origin_branch_name(self, obj):
        return obj.origin_warehouse.branch.name

    def get_destination_branch_name(self, obj):
        return obj.destination_warehouse.branch.name

    def get_asset_count(self, obj):
        return obj.assets.count()

    def get_dispatched_by_name(self, obj):
        if obj.dispatched_by:
            return obj.dispatched_by.get_full_name() or obj.dispatched_by.username
        return None

    def get_received_by_name(self, obj):
        if obj.received_by:
            return obj.received_by.get_full_name() or obj.received_by.username
        return None


# ─── Depreciación ──────────────────────────
class AssetDepreciationSerializer(serializers.ModelSerializer):
    asset_code = serializers.CharField(source='asset.code', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)

    class Meta:
        model = AssetDepreciation
        fields = [
            'id', 'asset', 'asset_code', 'asset_name',
            'period_date', 'method',
            'depreciation_amount', 'book_value_before', 'book_value_after',
            'calculated_at', 'calculated_by',
        ]
        read_only_fields = ['calculated_at', 'calculated_by']


# ─── Auditoría ──────────────────────────
class AssetAuditItemSerializer(serializers.ModelSerializer):
    asset_code = serializers.CharField(source='asset.code', read_only=True, default=None)
    asset_name = serializers.CharField(source='asset.name', read_only=True, default=None)

    class Meta:
        model = AssetAuditItem
        fields = ['id', 'audit', 'asset', 'asset_code', 'asset_name', 'result', 'notes', 'scanned_at']
        read_only_fields = ['scanned_at']


class AssetAuditSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    branch_name = serializers.SerializerMethodField()
    conducted_by_name = serializers.SerializerMethodField()
    items = AssetAuditItemSerializer(many=True, read_only=True)

    class Meta:
        model = AssetAudit
        fields = [
            'id', 'warehouse', 'warehouse_name', 'branch_name',
            'name', 'status', 'notes',
            'started_at', 'completed_at',
            'conducted_by', 'conducted_by_name',
            'total_expected', 'total_found', 'total_missing', 'total_surplus',
            'items',
        ]
        read_only_fields = ['started_at', 'total_expected', 'total_found', 'total_missing', 'total_surplus']

    def get_branch_name(self, obj):
        return obj.warehouse.branch.name

    def get_conducted_by_name(self, obj):
        if obj.conducted_by:
            return obj.conducted_by.get_full_name() or obj.conducted_by.username
        return None


# ─── Avalúo por Sede ──────────────────────────
class ValuationSerializer(serializers.Serializer):
    """Serializer para el reporte de avalúo por sede/almacén."""
    branch_id = serializers.IntegerField()
    branch_name = serializers.CharField()
    warehouses = serializers.ListField()
    total_assets = serializers.IntegerField()
    total_acquisition_cost = serializers.FloatField()
    total_book_value = serializers.FloatField()
    total_depreciation = serializers.FloatField()
