#!/usr/bin/env python
"""
Utilidad de línea de comandos de Django para tareas administrativas.
Sistema RRHH Multi-Tenant para Venezuela.
"""
import os
import sys
from typing import NoReturn


def main() -> NoReturn:
    """Ejecuta tareas administrativas."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "No se pudo importar Django. ¿Está seguro de que está instalado "
            "y disponible en su variable de entorno PYTHONPATH? ¿Olvidó "
            "activar un entorno virtual?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
