"""
Script para crear el tenant público y un tenant de prueba.
Ejecutar con: python create_tenants.py
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
os.environ['PGCLIENTENCODING'] = 'UTF8'
django.setup()

from customers.models import Client, Domain

def create_public_tenant():
    """Crea el tenant público (requerido por django-tenants)."""
    print("Creando tenant público...")
    
    # Verificar si ya existe
    if Client.objects.filter(schema_name='public').exists():
        print("  ✓ El tenant público ya existe")
        return Client.objects.get(schema_name='public')
    
    public_tenant = Client(
        schema_name='public',
        name='Sistema RRHH Venezuela',
        rif='J-00000000-0',
        on_trial=False,
    )
    public_tenant.save()
    print("  ✓ Tenant público creado")
    
    # Crear dominio para localhost
    Domain.objects.create(
        domain='localhost',
        tenant=public_tenant,
        is_primary=True
    )
    print("  ✓ Dominio localhost creado")
    
    return public_tenant

def create_test_tenant():
    """Crea un tenant de prueba (farmacia)."""
    print("\nCreando tenant de prueba (Farmacia Demo)...")
    
    schema_name = 'farmacia_gfo'
    
    # Verificar si ya existe
    if Client.objects.filter(schema_name=schema_name).exists():
        print("  ✓ El tenant de prueba ya existe")
        return Client.objects.get(schema_name=schema_name)
    
    tenant = Client(
        schema_name=schema_name,
        name='Farmacia GFO',
        rif='J-12345678-9',
        email='info@farmaospino.com',
        phone='0212-1234567',
        address='Caracas, Venezuela',
        on_trial=True,
    )
    tenant.save()
    print(f"  ✓ Tenant '{tenant.name}' creado con esquema '{schema_name}'")
    
    # Crear subdominio
    Domain.objects.create(
        domain='gfo.localhost',
        tenant=tenant,
        is_primary=True
    )
    print("  ✓ Dominio gfo.localhost creado")
    
    return tenant

def main():
    print("=" * 50)
    print("Configuración inicial de Tenants")
    print("=" * 50)
    
    # Crear tenant público
    create_public_tenant()
    
    # Crear tenant de prueba
    create_test_tenant()
    
    print("\n" + "=" * 50)
    print("¡Configuración completada!")
    print("=" * 50)
    print("\nPróximos pasos:")
    print("1. Migrar esquemas de tenant:")
    print("   $env:PGCLIENTENCODING='UTF8'; python manage.py migrate_schemas --tenant")
    print("\n2. Crear superusuario:")
    print("   $env:PGCLIENTENCODING='UTF8'; python manage.py createsuperuser")
    print("\n3. Iniciar servidor:")
    print("   $env:PGCLIENTENCODING='UTF8'; python manage.py runserver")
    print("\n4. Acceder al admin: http://localhost:8000/admin/")

if __name__ == '__main__':
    main()
