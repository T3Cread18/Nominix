import os
import sys
import django

# Añadir el directorio raíz al path para que encuentre rrhh_saas
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection
from customers.models import Client, Domain

def create_superadmin():
    # 1. Asegurar el Tenant Público
    print("Verificando Tenant Público...")
    public_tenant, created = Client.objects.get_or_create(
        schema_name='public',
        defaults={'name': 'Nominix Master Panel', 'rif': 'J-00000000-0'}
    )
    if created:
        print("Tenant Público creado.")
    
    # 2. Asegurar el Dominio del Panel Maestro
    print("Verificando Dominio Maestro (localhost)...")
    domain, created = Domain.objects.get_or_create(
        domain='localhost',
        tenant=public_tenant,
        defaults={'is_primary': True}
    )
    if created:
        print("Dominio 'localhost' asociado al Panel Maestro.")

    # 3. Crear/Actualizar Superusuario
    User = get_user_model()
    username = 'Pablo'
    password = 'T3Cread18'
    email = 'pablo@nominix.com'
    
    # Asegurarnos de estar en el esquema público
    with connection.cursor() as cursor:
        cursor.execute('SET search_path TO public')
    
    if not User.objects.filter(username=username).exists():
        print(f"Creando superusuario {username}...")
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name='Pablo',
            last_name='Admin'
        )
        print("Superusuario creado exitosamente.")
    else:
        # Actualizar contraseña si ya existe para asegurar acceso
        user = User.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"El usuario {username} ya existe. Contraseña actualizada.")

if __name__ == '__main__':
    create_superadmin()
