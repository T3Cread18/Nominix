"""
Configuración WSGI para el proyecto RRHH SaaS.

Expone el callable WSGI como una variable de nivel de módulo llamada ``application``.
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')

application = get_wsgi_application()
