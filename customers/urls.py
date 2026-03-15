"""
Configuración de URLs para la app Customers.

Define los endpoints de la API REST para gestión de tenants.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, TenantInfoView, AuthView, RoleViewSet, PermissionViewSet, ContactRequestView

app_name = 'customers'

# Router para el ViewSet
router = DefaultRouter()
router.register(r'tenants', ClientViewSet, basename='tenant')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'permissions', PermissionViewSet, basename='permission')

urlpatterns = [
    # Endpoints del ViewSet
    path('', include(router.urls)),
    
    # Endpoint para información del tenant actual
    path('tenant-info/', TenantInfoView.as_view(), name='tenant-info'),
    
    # Formulario de contacto / solicitud de acceso (público)
    path('contact/', ContactRequestView.as_view(), name='contact-request'),

    # Endpoints de Autenticación
    path('auth/login/', AuthView.as_view({'post': 'login'}), name='auth-login'),
    path('auth/csrf/', AuthView.as_view({'get': 'csrf'}), name='auth-csrf'),
    path('auth/logout/', AuthView.as_view({'post': 'logout'}), name='auth-logout'),
    path('auth/refresh/', AuthView.as_view({'post': 'refresh'}), name='auth-refresh'),
    path('auth/me/', AuthView.as_view({'get': 'me'}), name='auth-me'),
]
