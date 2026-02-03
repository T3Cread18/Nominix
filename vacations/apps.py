# -*- coding: utf-8 -*-
"""
Configuración de la aplicación de Vacaciones.
"""
from django.apps import AppConfig


class VacationsConfig(AppConfig):
    """Configuración del módulo de gestión de vacaciones."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'vacations'
    verbose_name = 'Gestión de Vacaciones'
    
    def ready(self):
        """Importa los signals cuando la app está lista."""
        import vacations.signals  # noqa: F401
