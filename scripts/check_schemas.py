"""
Script para verificar los esquemas y tablas creados en PostgreSQL.
Ejecutar con: python check_schemas.py
"""
import os
import sys

# Configurar encoding para Windows
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')

import django
django.setup()

from django.db import connection
from customers.models import Client, Domain

def check_schemas():
    """Lista todos los esquemas en la base de datos."""
    print("=" * 60)
    print("VERIFICACIÓN DE ESQUEMAS EN POSTGRESQL")
    print("=" * 60)
    
    with connection.cursor() as cursor:
        # Listar todos los esquemas
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY schema_name
        """)
        schemas = cursor.fetchall()
        
        print("\n📁 ESQUEMAS ENCONTRADOS:")
        print("-" * 40)
        for schema in schemas:
            print(f"  • {schema[0]}")
        
        # Para cada esquema, listar las tablas
        print("\n📊 TABLAS POR ESQUEMA:")
        print("-" * 40)
        
        for schema in schemas:
            schema_name = schema[0]
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = %s 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """, [schema_name])
            tables = cursor.fetchall()
            
            print(f"\n🗂️  [{schema_name}] - {len(tables)} tablas")
            for table in tables:
                print(f"      └─ {table[0]}")

def check_tenants():
    """Lista todos los tenants registrados."""
    print("\n" + "=" * 60)
    print("TENANTS REGISTRADOS EN EL SISTEMA")
    print("=" * 60)
    
    clients = Client.objects.all()
    
    if not clients:
        print("\n⚠️  No hay tenants registrados")
        return
    
    print(f"\n📋 Total: {clients.count()} tenant(s)\n")
    
    for client in clients:
        print(f"🏢 {client.name}")
        print(f"   Schema: {client.schema_name}")
        print(f"   RIF: {client.rif}")
        print(f"   En prueba: {'Sí' if client.on_trial else 'No'}")
        
        # Dominios asociados
        domains = Domain.objects.filter(tenant=client)
        print(f"   Dominios:")
        for domain in domains:
            primary = " (principal)" if domain.is_primary else ""
            print(f"      └─ {domain.domain}{primary}")
        print()

def check_tables_in_tenant(schema_name):
    """Verifica las tablas específicas de payroll en un tenant."""
    print(f"\n📊 TABLAS DE NÓMINA EN [{schema_name}]:")
    print("-" * 40)
    
    with connection.cursor() as cursor:
        # Buscar tablas de payroll_core
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = %s 
            AND table_name LIKE 'payroll_core%%'
            ORDER BY table_name
        """, [schema_name])
        tables = cursor.fetchall()
        
        if tables:
            for table in tables:
                # Contar registros
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{schema_name}"."{table[0]}"')
                    count = cursor.fetchone()[0]
                    print(f"  ✓ {table[0]}: {count} registro(s)")
                except Exception as e:
                    print(f"  ✗ {table[0]}: Error - {e}")
        else:
            print("  ⚠️  No se encontraron tablas de payroll_core")

if __name__ == '__main__':
    try:
        check_schemas()
        check_tenants()
        
        # Verificar tablas en el tenant de prueba
        if Client.objects.filter(schema_name='farmacia_demo').exists():
            check_tables_in_tenant('farmacia_demo')
        
        print("\n" + "=" * 60)
        print("✅ VERIFICACIÓN COMPLETADA")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
