"""
Script para gestionar usuarios por tenant.
Ejecutar con: python manage_users.py
"""
import os
import sys

# Configurar encoding antes de importar Django
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')

import django
django.setup()

from django.contrib.auth.models import User
from django_tenants.utils import schema_context
from customers.models import Client

def list_users(schema_name: str, tenant_name: str):
    """Lista los usuarios de un tenant específico."""
    print(f"\n📂 TENANT: {tenant_name} ({schema_name})")
    print("-" * 50)
    
    with schema_context(schema_name):
        users = User.objects.all()
        if not users:
            print("   ⚠️  No hay usuarios registrados")
        else:
            print(f"   👤 {users.count()} usuario(s):")
            for user in users:
                status = "🟢" if user.is_active else "🔴"
                role = "👑 Superadmin" if user.is_superuser else ("🛠️ Staff" if user.is_staff else "👤 Usuario")
                print(f"      - [{status}] {user.username} ({user.email}) - {role}")

def create_user(schema_name: str):
    """Crea un usuario en un tenant específico."""
    print(f"\n✨ Creando usuario en esquema '{schema_name}'...")
    
    username = input("   Usuario: ")
    email = input("   Email: ")
    password = input("   Password: ")
    is_staff = input("   ¿Es staff (acceso admin)? (si/no): ").lower() == 'si'
    is_superuser = False
    
    if is_staff:
        is_superuser = input("   ¿Es superusuario? (si/no): ").lower() == 'si'
    
    with schema_context(schema_name):
        if User.objects.filter(username=username).exists():
            print(f"\n❌ Error: El usuario '{username}' ya existe en este tenant.")
            return

        user = User.objects.create_user(username, email, password)
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.save()
        print(f"\n✅ Usuario '{username}' creado exitosamente en '{schema_name}'")

def main():
    print("=" * 60)
    print("GESTIÓN DE USUARIOS POR TENANT")
    print("=" * 60)
    
    clients = Client.objects.all().order_by('schema_name')
    
    # 1. Listar usuarios de todos los tenants
    for client in clients:
        list_users(client.schema_name, client.name)
    
    # 2. Menú de opciones
    while True:
        print("\n" + "=" * 60)
        print("1. Crear usuario en un tenant")
        print("2. Listar usuarios nuevamente")
        print("3. Salir")
        
        opcion = input("\nSeleccione una opción: ")
        
        if opcion == '1':
            print("\nTenants disponibles:")
            tenants_list = list(clients)
            for i, client in enumerate(tenants_list):
                print(f"{i+1}. {client.name} ({client.schema_name})")
            
            try:
                idx = int(input("\nSeleccione número de tenant: ")) - 1
                if 0 <= idx < len(tenants_list):
                    create_user(tenants_list[idx].schema_name)
                else:
                    print("❌ Selección inválida")
            except ValueError:
                print("❌ Debe ingresar un número")
                
        elif opcion == '2':
            for client in clients:
                list_users(client.schema_name, client.name)
                
        elif opcion == '3':
            print("\n¡Hasta luego!")
            break

if __name__ == '__main__':
    main()
