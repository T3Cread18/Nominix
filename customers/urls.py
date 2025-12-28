"""
Configuración de URLs para la app Customers.

Define los endpoints de la API REST para gestión de tenants.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, TenantInfoView, AuthView

app_name = 'customers'

# Router para el ViewSet
router = DefaultRouter()
router.register(r'tenants', ClientViewSet, basename='tenant')

urlpatterns = [
    # Endpoints del ViewSet
    path('', include(router.urls)),
    
    # Endpoint para información del tenant actual
    path('tenant-info/', TenantInfoView.as_view(), name='tenant-info'),
    
    # Endpoints de Autenticación
    path('auth/login/', AuthView.as_view({'post': 'login'}), name='auth-login'),
    path('auth/logout/', AuthView.as_view({'post': 'logout'}), name='auth-logout'),
    path('auth/me/', AuthView.as_view({'get': 'me'}), name='auth-me'),
]
