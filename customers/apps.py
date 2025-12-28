"""
Configuración de la app Customers.
"""
from django.apps import AppConfig


class CustomersConfig(AppConfig):
    """Configuración de la aplicación de clientes/inquilinos."""
    
    default_auto_field: str = 'django.db.models.BigAutoField'
    name: str = 'customers'
    verbose_name: str = 'Gestión de Clientes'
