"""
Utilidades base compartidas para los modelos de Payroll Core.
"""
from django.db import connection
import os


def tenant_upload_path(instance, filename):
    """
    Genera rutas de subida de archivos basadas en el tenant actual.
    
    Para Empleados: {schema}/employee_photos/{national_id}.{ext}
    Para Empresas: {schema}/company_logos/logo.{ext}
    """
    # 1. Obtener el esquema actual (ej: 'farmacia_perez')
    schema_name = connection.schema_name
    
    # 2. Obtener la extensión original ( .jpg, .png, etc. )
    extension = os.path.splitext(filename)[1]
    
    # 3. Determinar el nombre y la carpeta
    # Si es un Empleado, usamos su ID. Si es Empresa, le ponemos 'logo'
    if instance.__class__.__name__ == "Employee":
        folder = "employee_photos"
        # Si el empleado es nuevo y no tiene ID aún, usamos 'temp' o su cédula
        new_filename = f"{instance.national_id}{extension}"
    else:
        folder = "company_logos"
        new_filename = f"logo{extension}"
        
    # Retorna: 'nombre_esquema/employee_photos/5.jpg'
    return os.path.join(schema_name, folder, new_filename)
