"""
Script para generar documentación automática de cada tenant.
Ejecutar con: python generate_tenant_docs.py
"""
import os
import sys
from datetime import datetime

os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')

import django
django.setup()

from django.db import connection
from customers.models import Client, Domain


def generate_tenant_doc(client: Client, output_dir: str = 'docs/tenants') -> str:
    """Genera documentación markdown para un tenant específico."""
    
    # Crear directorio si no existe
    os.makedirs(output_dir, exist_ok=True)
    
    # Obtener dominios
    domains = Domain.objects.filter(tenant=client)
    
    # Obtener estadísticas del esquema
    stats = get_schema_stats(client.schema_name)
    
    # Generar contenido markdown
    content = f"""# 🏢 {client.name}

## Información General

| Campo | Valor |
|-------|-------|
| **Schema** | `{client.schema_name}` |
| **RIF** | {client.rif} |
| **Email** | {client.email or 'No configurado'} |
| **Teléfono** | {client.phone or 'No configurado'} |
| **Estado** | {'🟢 Activo' if not client.on_trial else '🟡 Período de prueba'} |
| **Registrado** | {client.created_on.strftime('%d/%m/%Y %H:%M') if client.created_on else 'N/A'} |
| **Pagado hasta** | {client.paid_until.strftime('%d/%m/%Y') if client.paid_until else 'Sin vencimiento'} |

## Dirección

{client.address or '_No configurada_'}

## Dominios Configurados

| Dominio | Principal |
|---------|-----------|
"""
    
    for domain in domains:
        primary = '✅ Sí' if domain.is_primary else '❌ No'
        content += f"| `{domain.domain}` | {primary} |\n"
    
    if not domains:
        content += "| _Sin dominios configurados_ | - |\n"
    
    content += f"""
## Estadísticas de Base de Datos

| Tabla | Registros |
|-------|-----------|
"""
    
    for table, count in stats.items():
        table_display = table.replace('payroll_core_', '').replace('auth_', 'auth/')
        content += f"| `{table_display}` | {count} |\n"
    
    content += f"""
## Acceso

- **URL Admin**: `http://{domains.first().domain if domains.first() else 'localhost'}:8000/admin/`
- **API Base**: `http://{domains.first().domain if domains.first() else 'localhost'}:8000/api/`

## Endpoints API Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/employees/` | Listar empleados |
| GET | `/api/contracts/` | Listar contratos |
| GET | `/api/currencies/` | Listar monedas |
| GET | `/api/exchange-rates/` | Tasas de cambio |

---

_Documentación generada automáticamente el {datetime.now().strftime('%d/%m/%Y %H:%M')}_
"""
    
    # Guardar archivo
    filename = f"{client.schema_name}.md"
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return filepath


def get_schema_stats(schema_name: str) -> dict:
    """Obtiene estadísticas de las tablas en un esquema."""
    stats = {}
    
    if schema_name == 'public':
        tables = [
            'customers_client',
            'customers_domain',
            'auth_user',
            'auth_group',
        ]
    else:
        tables = [
            'payroll_core_employee',
            'payroll_core_laborcontract',
            'payroll_core_currency',
            'payroll_core_exchangerate',
            'auth_user',
        ]
    
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f'SELECT COUNT(*) FROM "{schema_name}"."{table}"')
                count = cursor.fetchone()[0]
                stats[table] = count
            except Exception:
                stats[table] = 'N/A'
    
    return stats


def generate_index(clients: list, output_dir: str = 'docs/tenants') -> str:
    """Genera un índice de todos los tenants."""
    
    content = f"""# 📋 Índice de Tenants

_Última actualización: {datetime.now().strftime('%d/%m/%Y %H:%M')}_

## Resumen

| Métrica | Valor |
|---------|-------|
| Total Tenants | {len(clients)} |
| En Prueba | {sum(1 for c in clients if c.on_trial)} |
| Activos | {sum(1 for c in clients if not c.on_trial)} |
| Total Dominios | {Domain.objects.count()} |

## Lista de Tenants

| Tenant | Schema | RIF | Estado | Documentación |
|--------|--------|-----|--------|---------------|
"""
    
    for client in clients:
        status = '🟡 Prueba' if client.on_trial else '🟢 Activo'
        doc_link = f"[Ver](./{client.schema_name}.md)"
        content += f"| {client.name} | `{client.schema_name}` | {client.rif} | {status} | {doc_link} |\n"
    
    content += """
## Estructura de Documentación

```
docs/tenants/
├── README.md          # Este índice
├── public.md          # Tenant público (sistema)
└── [schema_name].md   # Documentación por tenant
```

## Regenerar Documentación

Para regenerar toda la documentación:

```powershell
$env:PGCLIENTENCODING='UTF8'
python generate_tenant_docs.py
```
"""
    
    # Guardar índice
    filepath = os.path.join(output_dir, 'README.md')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return filepath


def main():
    print("=" * 60)
    print("GENERADOR DE DOCUMENTACIÓN DE TENANTS")
    print("=" * 60)
    
    # Obtener todos los tenants
    clients = Client.objects.all().order_by('schema_name')
    
    if not clients:
        print("\n⚠️  No hay tenants registrados")
        return
    
    print(f"\n📋 Encontrados {clients.count()} tenant(s)\n")
    
    # Generar documentación para cada tenant
    generated_files = []
    
    for client in clients:
        print(f"📝 Generando docs para: {client.name}...")
        filepath = generate_tenant_doc(client)
        generated_files.append(filepath)
        print(f"   ✓ Creado: {filepath}")
    
    # Generar índice
    print(f"\n📑 Generando índice...")
    index_path = generate_index(list(clients))
    print(f"   ✓ Creado: {index_path}")
    
    print("\n" + "=" * 60)
    print("✅ DOCUMENTACIÓN GENERADA EXITOSAMENTE")
    print("=" * 60)
    print(f"\n📁 Ubicación: docs/tenants/")
    print(f"📄 Archivos generados: {len(generated_files) + 1}")


if __name__ == '__main__':
    main()
