"""
Admin para el módulo de Activos Fijos.
"""
from django.contrib import admin
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


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'useful_life_years', 'depreciation_method', 'is_active']
    list_filter = ['is_active', 'depreciation_method']
    search_fields = ['name']


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ['name', 'branch', 'is_active']
    list_filter = ['is_active', 'branch']
    search_fields = ['name']


class AssetPhotoInline(admin.TabularInline):
    model = AssetPhoto
    extra = 0


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name', 'category', 'warehouse',
        'acquisition_cost', 'current_book_value', 'status',
    ]
    list_filter = ['status', 'category', 'warehouse__branch', 'depreciation_method']
    search_fields = ['code', 'name', 'serial_number', 'barcode']
    readonly_fields = ['code', 'current_book_value', 'created_at', 'updated_at']
    inlines = [AssetPhotoInline]


@admin.register(AssetInvoice)
class AssetInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'vendor_name', 'invoice_date', 'total_amount', 'currency']
    list_filter = ['currency']
    search_fields = ['invoice_number', 'vendor_name']


@admin.register(AssetMovement)
class AssetMovementAdmin(admin.ModelAdmin):
    list_display = [
        'guide_number', 'origin_warehouse', 'destination_warehouse',
        'status', 'dispatched_at', 'received_at',
    ]
    list_filter = ['status']
    readonly_fields = ['guide_number', 'dispatched_at', 'dispatched_by', 'received_at', 'received_by']


@admin.register(AssetDepreciation)
class AssetDepreciationAdmin(admin.ModelAdmin):
    list_display = ['asset', 'period_date', 'depreciation_amount', 'book_value_after']
    list_filter = ['method', 'period_date']


@admin.register(AssetAudit)
class AssetAuditAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'warehouse', 'status',
        'total_expected', 'total_found', 'total_missing',
    ]
    list_filter = ['status']
