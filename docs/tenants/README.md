# 📋 Índice de Tenants

_Última actualización: 27/12/2025 13:07_

## Resumen

| Métrica | Valor |
|---------|-------|
| Total Tenants | 2 |
| En Prueba | 1 |
| Activos | 1 |
| Total Dominios | 2 |

## Lista de Tenants

| Tenant | Schema | RIF | Estado | Documentación |
|--------|--------|-----|--------|---------------|
| Grupo Farmacias Ospino | `grupo_farmacias_ospino` | J-31231231-9 | 🟡 Prueba | [Ver](./grupo_farmacias_ospino.md) |
| Sistema RRHH Venezuela | `public` | J-00000000-0 | 🟢 Activo | [Ver](./public.md) |

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
