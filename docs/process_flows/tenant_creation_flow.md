# Creación de Empresas (Tenancy)

Nomínix utiliza una arquitectura Multi-Tenant con esquemas aislados (PostgreSQL Schemas). Este flujo describe cómo se aprovisiona un nuevo entorno para un cliente.

## Diagrama Visual

![Diagrama de Flujo de Tenancy](tenant_creation_flow.png)

## Flujo Técnico

1.  **Registro de Tenant**:
    *   **Entidad**: `Client` (De `django-tenants`).
    *   **Datos**: Nombre de la empresa, Subdominio (ej: `empresaA.nominix.com`), Plan de suscripción.

2.  **Aprovisionamiento de Infraestructura**:
    *   Al guardar el cliente, el sistema dispara automáticamente la creación de un nuevo **Esquema de Base de Datos** en PostgreSQL.
    *   Esto garantiza el aislamiento total de la data sensible (empleados, contratos) entre clientes.

3.  **Migraciones**:
    *   Se ejecutan las migraciones de Django (`manage.py migrate_schemas`) exclusivamente en el nuevo esquema.
    *   Se crean las tablas de `payroll_core`, `vacations`, y demás apps del negocio.

4.  **Usuario Administrador**:
    *   Se crea un usuario inicial con permisos de SuperAdmin dentro de ese esquema.

5.  **Activación**:
    *   Se crea el dominio asociado (`Domain`) apuntando al esquema.
    *   El tenant pasa a estado `ACTIVE` y es accesible vía URL.
