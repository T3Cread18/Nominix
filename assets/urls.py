"""
URLs para el módulo de Activos Fijos.

Registra todos los endpoints REST bajo /api/assets/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.AssetCategoryViewSet, basename='asset-categories')
router.register(r'warehouses', views.WarehouseViewSet, basename='asset-warehouses')
router.register(r'invoices', views.AssetInvoiceViewSet, basename='asset-invoices')
router.register(r'items', views.AssetViewSet, basename='asset-items')
router.register(r'movements', views.AssetMovementViewSet, basename='asset-movements')
router.register(r'depreciation', views.AssetDepreciationViewSet, basename='asset-depreciation')
router.register(r'audits', views.AssetAuditViewSet, basename='asset-audits')
router.register(r'valuation', views.ValuationViewSet, basename='asset-valuation')

urlpatterns = [
    path('', include(router.urls)),
]
