"""
Configuración de URLs para el proyecto RRHH SaaS.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from typing import List


urlpatterns: List = [
    path('admin/', admin.site.urls),
    path('api/', include('payroll_core.urls')),
    path('api/', include('customers.urls')),  # API de gestión de tenants
    path('api/', include('vacations.urls')),  # Módulo de Vacaciones
    path('api/biometric/', include('biometrics.urls')),  # Módulo Biométrico
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Configuración del sitio de administración
admin.site.site_header = 'RRHH Venezuela - Administración'
admin.site.site_title = 'RRHH Venezuela'
admin.site.index_title = 'Panel de Administración'
