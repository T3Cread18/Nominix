"""
Configuración de la app Payroll Core.
"""
from django.apps import AppConfig


class PayrollCoreConfig(AppConfig):
    """Configuración de la aplicación de nómina y RRHH."""
    
    default_auto_field: str = 'django.db.models.BigAutoField'
    name: str = 'payroll_core'
    verbose_name: str = 'Nómina y Recursos Humanos'
