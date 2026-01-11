"""
Script para eliminar un tenant y su esquema.
Ejecutar con: python delete_tenant.py farmacia_gfo
"""
import os
import sys

os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')

import django
django.setup()

from django.db import connection
from customers.models import Client, Domain

def delete_tenant(schema_name: str):
    """Elimina un tenant y su esquema de PostgreSQL."""
    
    print(f"\n{'='*50}")
    print(f"ELIMINAR TENANT: {schema_name}")
    print(f"{'='*50}")
    
    # Verificar que existe
    try:
        client = Client.objects.get(schema_name=schema_name)
    except Client.DoesNotExist:
        print(f"\n❌ No existe un tenant con schema '{schema_name}'")
        return False
    
    # Mostrar información
    print(f"\n📋 Información del tenant:")
    print(f"   Nombre: {client.name}")
    print(f"   RIF: {client.rif}")
    print(f"   Schema: {client.schema_name}")
    
    # Confirmar eliminación
    confirm = input(f"\n⚠️  ¿Estás seguro de eliminar '{client.name}'? (escribir 'SI' para confirmar): ")
    
    if confirm.upper() != 'SI':
        print("\n❌ Operación cancelada")
        return False
    
    # Eliminar dominios primero
    print("\n🗑️  Eliminando dominios...")
    domains = Domain.objects.filter(tenant=client)
    for domain in domains:
        print(f"   Eliminando: {domain.domain}")
        domain.delete()
    
    # Eliminar el cliente (esto NO elimina el esquema automáticamente)
    print(f"\n🗑️  Eliminando registro del cliente...")
    client.delete()
    
    # Eliminar el esquema de PostgreSQL
    print(f"\n🗑️  Eliminando esquema '{schema_name}' de PostgreSQL...")
    with connection.cursor() as cursor:
        # Usar CASCADE para eliminar todas las tablas
        cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
    
    print(f"\n✅ Tenant '{schema_name}' eliminado completamente")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("\nUso: python delete_tenant.py <schema_name>")
        print("Ejemplo: python delete_tenant.py farmacia_gfo")
        
        # Listar tenants disponibles
        print("\nTenants disponibles:")
        for client in Client.objects.exclude(schema_name='public'):
            print(f"  - {client.schema_name} ({client.name})")
    else:
        schema_name = sys.argv[1]
        
        if schema_name == 'public':
            print("\n❌ No puedes eliminar el esquema 'public'")
        else:
            delete_tenant(schema_name)
