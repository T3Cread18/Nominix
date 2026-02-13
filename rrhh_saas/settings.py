"""
Configuración de Django para el proyecto RRHH SaaS Multi-Tenant.

Sistema de Recursos Humanos adaptado a la legislación venezolana.
Utiliza django-tenants para manejo de multi-inquilinos mediante esquemas PostgreSQL.
"""
import os
import dj_database_url
from pathlib import Path
from typing import List, Dict, Any

# =============================================================================
# CONFIGURACIÓN BASE
# =============================================================================

BASE_DIR: Path = Path(__file__).resolve().parent.parent

SECRET_KEY: str = os.environ.get('SECRET_KEY', 'django-insecure-cambiar-en-produccion-clave-larga-y-segura')

DEBUG: bool = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS: List[str] = ['localhost', '127.0.0.1', '.localhost', 'gfo.lan', 'rrhh.gfo.lan', '*.gfo.lan', '[IP_ADDRESS]', '*.192.168.1.100', '[IP_ADDRESS]', '[IP_ADDRESS]']

# Dominio base para la creación automática de subdominios
TENANT_BASE_DOMAIN: str = os.environ.get('TENANT_BASE_DOMAIN', 'localhost')

# Orígenes confiables para CSRF (Necesario para el frontend desacoplado)
CSRF_TRUSTED_ORIGINS: List[str] = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://*.localhost:3000',
    'http://localhost:8000',
    'http://*.localhost:8000',
]
CORS_ALLOW_ALL_ORIGINS = True
# =============================================================================
# CONFIGURACIÓN DE DJANGO-TENANTS
# =============================================================================

# Apps compartidas: van en el esquema 'public' de PostgreSQL
# Estas apps son accesibles por todos los inquilinos
SHARED_APPS: List[str] = [
    'django_tenants',  # Debe estar primero
    'customers',       # Gestión de clientes/inquilinos
    
    # Apps de Django
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'corsheaders',
    
    # Apps de terceros
    'rest_framework',
]
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
if DEBUG:
    # Esto ayuda a que el servidor de media sepa que no está en el puerto 80
    DEFAULT_HTTP_PROTOCOL = 'http'
# Apps del inquilino: van en el esquema de cada tenant
# Cada farmacia tendrá su propia copia de estas tablas
TENANT_APPS: List[str] = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.admin',
    'django_cleanup.apps.CleanupConfig',
    # Apps de nómina y RRHH
    'payroll_core',
    'vacations',  # Módulo de Gestión de Vacaciones
    'biometrics',  # Módulo de Control Biométrico
]

# Combinación de todas las apps instaladas
INSTALLED_APPS: List[str] = list(SHARED_APPS) + [
    app for app in TENANT_APPS if app not in SHARED_APPS
]

# Modelo que representa al inquilino (Cliente/Farmacia)
TENANT_MODEL: str = 'customers.Client'

# Modelo que representa los dominios
TENANT_DOMAIN_MODEL: str = 'customers.Domain'

# =============================================================================
# MIDDLEWARE
# =============================================================================


MIDDLEWARE: List[str] = [
    'django_tenants.middleware.main.TenantMainMiddleware',  # Debe estar primero
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF: str = 'rrhh_saas.urls'

# =============================================================================
# TEMPLATES
# =============================================================================

TEMPLATES: List[Dict[str, Any]] = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION: str = 'rrhh_saas.wsgi.application'

# =============================================================================
# BASE DE DATOS - PostgreSQL con django-tenants
# =============================================================================

# Configuración de Base de Datos dinámica para Docker/Producción
DATABASES = {
    'default': dj_database_url.config(
        default='postgres://postgres:T3Cread18@localhost:5432/rrhh_saas',
        conn_max_age=600
    )
}
DATABASES['default']['ENGINE'] = 'django_tenants.postgresql_backend'

# Router de base de datos para django-tenants
DATABASE_ROUTERS: List[str] = [
    'django_tenants.routers.TenantSyncRouter',
]

# =============================================================================
# VALIDACIÓN DE CONTRASEÑAS
# =============================================================================

AUTH_PASSWORD_VALIDATORS: List[Dict[str, str]] = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# =============================================================================
# INTERNACIONALIZACIÓN - Configurado para Venezuela
# =============================================================================

LANGUAGE_CODE: str = 'es-ve'

TIME_ZONE: str = 'America/Caracas'

USE_I18N: bool = True

USE_TZ: bool = True

# =============================================================================
# ARCHIVOS ESTÁTICOS
# =============================================================================

STATIC_URL: str = '/static/'
STATIC_ROOT: Path = BASE_DIR / 'staticfiles'
STATICFILES_DIRS: List[Path] = [
    BASE_DIR / 'static',
]

# =============================================================================
# ARCHIVOS MEDIA
# =============================================================================
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MULTITENANT_RELATIVE_MEDIA_ROOT = ""
# =============================================================================
# CONFIGURACIÓN POR DEFECTO
# =============================================================================

DEFAULT_AUTO_FIELD: str = 'django.db.models.BigAutoField'

# =============================================================================
# DJANGO REST FRAMEWORK
# =============================================================================

REST_FRAMEWORK: Dict[str, Any] = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rrhh_saas.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
}

# =============================================================================
# CONFIGURACIÓN ESPECÍFICA PARA VENEZUELA
# =============================================================================

# Formato de RIF venezolano: J-12345678-9
VENEZUELA_RIF_PATTERN: str = r'^[JVEGPC]-\d{8}-\d$'

# Formato de Cédula: V-12345678 o E-12345678
VENEZUELA_CEDULA_PATTERN: str = r'^[VE]-\d{7,8}$'

# Moneda base para reportes
DEFAULT_CURRENCY: str = 'VES'

# Fuentes de tasas de cambio
EXCHANGE_RATE_SOURCES: List[str] = ['BCV', 'MONITOR']
