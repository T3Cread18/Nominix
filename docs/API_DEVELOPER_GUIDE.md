# 🔌 Guía de Desarrollo API — Nóminix Suite

> Referencia completa para integración con la API REST de Nóminix.
> **Versión:** 2.0.0 | **Última Actualización:** Enero 2026

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Multi-Tenancy](#multi-tenancy)
4. [Formato de Respuestas](#formato-de-respuestas)
5. [Endpoints por Recurso](#endpoints-por-recurso)
6. [Ejemplos cURL](#ejemplos-curl)
7. [SDK (JavaScript/Axios)](#sdk-javascriptaxios)
8. [Webhooks](#webhooks)
9. [Límites y Throttling](#límites-y-throttling)
10. [Errores Comunes](#errores-comunes)

---

## Introducción

La API de Nóminix está construida con **Django REST Framework** y sigue los principios REST.

### Base URL

```
https://{tenant}.nominix.com.ve/api/
```

Donde `{tenant}` es el subdominio del inquilino (ej: `empresa`, `acme`).

### Content-Type

```
Content-Type: application/json
```

Todas las requests deben enviar y recibir JSON, excepto endpoints de exportación.

---

## Autenticación

### Método: Session + CSRF (Frontend Web)

La API utiliza autenticación basada en sesión con protección CSRF.

#### Flujo de Login

```http
POST /api/auth/login/
Content-Type: application/json

{
    "username": "usuario@empresa.com",
    "password": "contraseña123"
}
```

#### Respuesta Exitosa

```json
{
    "id": 1,
    "username": "usuario@empresa.com",
    "email": "usuario@empresa.com",
    "first_name": "Juan",
    "last_name": "Pérez"
}
```

La respuesta incluirá cookies:
- `csrftoken`: Token CSRF (incluir en headers de requests mutantes)
- `sessionid`: Cookie de sesión

#### Requests Autenticadas

```http
POST /api/employees/
Cookie: sessionid=abc123; csrftoken=xyz789
X-CSRFToken: xyz789
Content-Type: application/json

{...}
```

### Método: Token (Integraciones)

Para integraciones de terceros, usar autenticación por Token.

```http
GET /api/employees/
Authorization: Token abc123xyz789
```

Solicitar token a través del panel de administración o API de tokens.

---

## Multi-Tenancy

Cada tenant opera en un subdominio único. El middleware detecta el tenant automáticamente.

### Identificación por Subdominio

```http
GET https://acme.nominix.com.ve/api/employees/
```

Este request accederá al schema `acme` en PostgreSQL.

### Información del Tenant

```http
GET /api/tenant/info/
```

```json
{
    "id": 1,
    "name": "ACME Corporation",
    "schema_name": "acme",
    "rif": "J-12345678-9",
    "status": "ACTIVE",
    "domain": "acme.nominix.com.ve"
}
```

---

## Formato de Respuestas

### Respuesta Exitosa (Objeto)

```json
{
    "id": 123,
    "first_name": "Juan",
    "last_name": "Pérez",
    ...
}
```

### Respuesta Exitosa (Lista Paginada)

```json
{
    "count": 150,
    "next": "https://tenant.nominix.com.ve/api/employees/?page=2",
    "previous": null,
    "results": [
        { "id": 1, "first_name": "Juan", ... },
        { "id": 2, "first_name": "María", ... },
        ...
    ]
}
```

### Respuesta de Error

```json
{
    "error": "Mensaje de error legible",
    "code": "VALIDATION_ERROR",
    "details": {
        "email": ["Este campo es requerido."],
        "national_id": ["Ya existe un empleado con esta cédula."]
    }
}
```

### Códigos HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | Request exitosa |
| 201 | Created | Recurso creado |
| 204 | No Content | Eliminación exitosa |
| 400 | Bad Request | Datos inválidos |
| 401 | Unauthorized | No autenticado |
| 403 | Forbidden | Sin permisos |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Conflicto (ej: duplicado) |
| 500 | Server Error | Error interno |

---

## Endpoints por Recurso

### 👥 Empleados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/employees/` | Listar empleados (paginado) |
| POST | `/api/employees/` | Crear empleado |
| GET | `/api/employees/{id}/` | Obtener empleado |
| PUT | `/api/employees/{id}/` | Actualizar empleado |
| PATCH | `/api/employees/{id}/` | Actualizar parcial |
| DELETE | `/api/employees/{id}/` | Eliminar empleado |
| GET/POST | `/api/employees/{id}/simulate-payslip/` | Simular nómina |

#### Filtros Disponibles

```
GET /api/employees/?search=Juan&branch=1&is_active=true&page=1
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Búsqueda por nombre/cédula |
| `branch` | int | ID de sede |
| `is_active` | bool | Solo activos/inactivos |
| `page` | int | Página (default: 1) |

---

### 📝 Contratos Laborales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/contracts/` | Listar contratos |
| POST | `/api/contracts/` | Crear contrato |
| GET | `/api/contracts/{id}/` | Obtener contrato |
| PUT | `/api/contracts/{id}/` | Actualizar contrato |
| DELETE | `/api/contracts/{id}/` | Eliminar contrato |

#### Filtros Disponibles

```
GET /api/contracts/?employee=123&is_active=true&branch=1
```

---

### 🏢 Organización

#### Sedes (Branches)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/branches/` | Listar sedes |
| POST | `/api/branches/` | Crear sede |
| GET | `/api/branches/{id}/` | Obtener sede |
| PUT | `/api/branches/{id}/` | Actualizar sede |
| DELETE | `/api/branches/{id}/` | Eliminar sede |

#### Departamentos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/departments/` | Listar departamentos |
| POST | `/api/departments/` | Crear departamento |
| GET | `/api/departments/{id}/` | Obtener departamento |
| PUT | `/api/departments/{id}/` | Actualizar |
| DELETE | `/api/departments/{id}/` | Eliminar |

```
GET /api/departments/?branch=1&search=recursos
```

#### Cargos (Job Positions)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/job-positions/` | Listar cargos |
| POST | `/api/job-positions/` | Crear cargo |
| GET | `/api/job-positions/{id}/` | Obtener cargo |
| PUT | `/api/job-positions/{id}/` | Actualizar |
| DELETE | `/api/job-positions/{id}/` | Eliminar |

```
GET /api/job-positions/?department=3
```

---

### 💼 Configuración de Empresa

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/company/config/` | Obtener configuración |
| PUT | `/api/company/config/` | Actualizar configuración |
| GET | `/api/company/policies/` | Obtener políticas de nómina |
| PUT | `/api/company/policies/` | Actualizar políticas |

---

### 📅 Periodos de Nómina

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/payroll-periods/` | Listar periodos |
| POST | `/api/payroll-periods/` | Crear periodo |
| GET | `/api/payroll-periods/{id}/` | Obtener periodo |
| PUT | `/api/payroll-periods/{id}/` | Actualizar periodo |
| DELETE | `/api/payroll-periods/{id}/` | Eliminar periodo |
| GET/POST | `/api/payroll-periods/{id}/preview-payroll/` | Vista previa de nómina |
| POST | `/api/payroll-periods/{id}/close-period/` | Cerrar periodo |
| GET | `/api/payroll-periods/{id}/export-pdf/` | Exportar PDF de recibos |
| GET | `/api/payroll-periods/{id}/export-finance/` | Exportar Excel finanzas |

#### Parámetros de Preview/Close

```
POST /api/payroll-periods/5/close-period/
{
    "manual_rate": 55.75
}
```

#### Parámetros de Export PDF

```
GET /api/payroll-periods/5/export-pdf/?tipo=salario
```

| Tipo | Descripción |
|------|-------------|
| `todos` | Todos los recibos (default) |
| `salario` | Solo recibo de salario |
| `complemento` | Solo recibo de complemento |
| `cestaticket` | Solo recibo de cestaticket |

---

### 📄 Recibos de Pago

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/payroll-receipts/` | Listar recibos |
| GET | `/api/payroll-receipts/{id}/` | Obtener recibo |
| GET | `/api/payroll-receipts/{id}/export-pdf/` | Exportar PDF individual |

```
GET /api/payroll-receipts/?period=5&employee=123
```

---

### 💡 Conceptos de Nómina

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/payroll-concepts/` | Listar conceptos |
| POST | `/api/payroll-concepts/` | Crear concepto |
| GET | `/api/payroll-concepts/{id}/` | Obtener concepto |
| PUT | `/api/payroll-concepts/{id}/` | Actualizar concepto |
| DELETE | `/api/payroll-concepts/{id}/` | Eliminar concepto |
| GET | `/api/concepts/config-metadata/` | Metadata para constructor |

```
GET /api/payroll-concepts/?kind=EARNING&active=true
```

---

### 📋 Novedades de Nómina

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/payroll-novelties/` | Listar novedades |
| POST | `/api/payroll-novelties/` | Crear novedad |
| PUT | `/api/payroll-novelties/{id}/` | Actualizar novedad |
| DELETE | `/api/payroll-novelties/{id}/` | Eliminar novedad |
| GET | `/api/payroll-novelties/metadata/` | Conceptos disponibles |
| POST | `/api/payroll-novelties/batch/` | Carga masiva |

```
GET /api/payroll-novelties/?employee=123&period=5
```

#### Carga Masiva

```json
POST /api/payroll-novelties/batch/
[
    { "employee_id": 123, "period_id": 5, "concept_code": "H_EXTRA", "amount": 8 },
    { "employee_id": 124, "period_id": 5, "concept_code": "FALTAS", "amount": 1 }
]
```

---

### 💳 Préstamos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/loans/` | Listar préstamos |
| POST | `/api/loans/` | Crear préstamo |
| GET | `/api/loans/{id}/` | Obtener préstamo |
| PUT | `/api/loans/{id}/` | Actualizar préstamo |
| GET | `/api/loans/{id}/payments/` | Pagos del préstamo |
| POST | `/api/loans/{id}/register-payment/` | Registrar pago |

```
GET /api/loans/?employee=123&status=ACTIVO
```

---

### 📊 Prestaciones Sociales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/social-benefits/ledger/` | Listar movimientos |
| GET | `/api/social-benefits/balance/{employee_id}/` | Saldo actual |
| POST | `/api/social-benefits/process-quarterly/` | Procesar garantía |
| POST | `/api/social-benefits/process-additional-days/` | Procesar días adicionales |
| POST | `/api/social-benefits/process-interest/` | Procesar intereses |
| POST | `/api/social-benefits/settlement-simulation/` | Simular liquidación |
| GET | `/api/social-benefits/settlements/` | Listar liquidaciones |
| POST | `/api/social-benefits/settlements/` | Crear liquidación |
| POST | `/api/social-benefits/register-advance/` | Registrar anticipo |

```
GET /api/social-benefits/ledger/?employee=123
```

#### Simular Liquidación

```json
POST /api/social-benefits/settlement-simulation/
{
    "employee_id": 123,
    "termination_date": "2026-01-31"
}
```

---

### 💱 Monedas y Tasas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/currencies/` | Listar monedas |
| GET | `/api/exchange-rates/` | Listar tasas históricas |
| GET | `/api/exchange-rates/latest/` | Tasa más reciente |
| POST | `/api/exchange-rates/sync-bcv/` | Sincronizar con BCV |
| GET | `/api/interest-rates/` | Tasas de interés BCV |
| POST | `/api/interest-rates/` | Crear tasa de interés |

```
GET /api/exchange-rates/latest/?currency=USD
```

---

## Ejemplos cURL

### Login

```bash
curl -X POST https://empresa.nominix.com.ve/api/auth/login/ \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "usuario@empresa.com",
    "password": "contraseña123"
  }'
```

### Listar Empleados

```bash
curl https://empresa.nominix.com.ve/api/employees/ \
  -b cookies.txt
```

### Crear Empleado

```bash
curl -X POST https://empresa.nominix.com.ve/api/employees/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $(grep csrftoken cookies.txt | cut -f7)" \
  -b cookies.txt \
  -d '{
    "first_name": "Juan",
    "last_name": "Pérez",
    "national_id": "V-12345678",
    "id_type": "V",
    "email": "juan@empresa.com",
    "hire_date": "2026-01-15",
    "branch": 1,
    "department": 3,
    "position": 5
  }'
```

### Simular Nómina

```bash
curl -X POST https://empresa.nominix.com.ve/api/employees/123/simulate-payslip/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $(grep csrftoken cookies.txt | cut -f7)" \
  -b cookies.txt \
  -d '{
    "FALTAS": 2,
    "H_EXTRA": 8
  }'
```

### Obtener Tasa BCV

```bash
curl https://empresa.nominix.com.ve/api/exchange-rates/latest/?currency=USD \
  -b cookies.txt
```

### Cerrar Periodo

```bash
curl -X POST https://empresa.nominix.com.ve/api/payroll-periods/5/close-period/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $(grep csrftoken cookies.txt | cut -f7)" \
  -b cookies.txt \
  -d '{
    "manual_rate": 55.75
  }'
```

### Exportar PDF de Recibos

```bash
curl https://empresa.nominix.com.ve/api/payroll-periods/5/export-pdf/?tipo=todos \
  -b cookies.txt \
  -o recibos_periodo_5.pdf
```

### Simular Liquidación

```bash
curl -X POST https://empresa.nominix.com.ve/api/social-benefits/settlement-simulation/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $(grep csrftoken cookies.txt | cut -f7)" \
  -b cookies.txt \
  -d '{
    "employee_id": 123,
    "termination_date": "2026-01-31"
  }'
```

---

## SDK (JavaScript/Axios)

### Configuración Inicial

```javascript
// api/client.js
import axios from 'axios';

const api = axios.create({
    baseURL: `https://${window.location.hostname}/api`,
    withCredentials: true,  // Importante para cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para CSRF
api.interceptors.request.use((config) => {
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
        config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
});

// Interceptor para errores
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
```

### Ejemplos de Uso

```javascript
import api from '@/api/client';

// Listar empleados
const employees = await api.get('/employees/', { 
    params: { search: 'Juan', is_active: true } 
});

// Crear empleado
const newEmployee = await api.post('/employees/', {
    first_name: 'Juan',
    last_name: 'Pérez',
    national_id: 'V-12345678',
});

// Simular nómina
const simulation = await api.post('/employees/123/simulate-payslip/', {
    FALTAS: 2,
    H_EXTRA: 8,
});

// Cerrar periodo
const result = await api.post('/payroll-periods/5/close-period/', {
    manual_rate: 55.75,
});
```

---

## Webhooks

> [!NOTE]
> Los webhooks están planificados para futuras versiones de Nóminix.

Eventos planificados:
- `payroll.period.closed` - Periodo cerrado
- `employee.created` - Empleado creado
- `settlement.created` - Liquidación creada

---

## Límites y Throttling

| Tipo de Request | Límite |
|-----------------|--------|
| Lectura (GET) | 1000 req/min |
| Escritura (POST/PUT/DELETE) | 100 req/min |
| Exportación (PDF/Excel) | 10 req/min |
| Sincronización BCV | 10 req/hora |

Al exceder límites, recibe:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

---

## Errores Comunes

### 400 Bad Request - Validación

```json
{
    "error": "Error de validación",
    "details": {
        "national_id": ["Ya existe un empleado con esta cédula."],
        "email": ["Ingrese una dirección de correo válida."]
    }
}
```

### 401 Unauthorized

```json
{
    "detail": "Las credenciales de autenticación no se proveyeron."
}
```

**Solución**: Verificar login y cookies de sesión.

### 403 Forbidden - CSRF

```json
{
    "detail": "CSRF Failed: CSRF token missing or incorrect."
}
```

**Solución**: Incluir header `X-CSRFToken` con valor de cookie `csrftoken`.

### 403 Forbidden - Permisos

```json
{
    "detail": "No tiene permiso para realizar esta acción."
}
```

**Solución**: Verificar permisos del usuario.

### 404 Not Found

```json
{
    "detail": "No encontrado."
}
```

**Solución**: Verificar ID del recurso.

### 409 Conflict - Contrato Activo

```json
{
    "error": "El empleado ya tiene un contrato activo. Desactive el contrato anterior primero."
}
```

**Solución**: Desactivar contrato existente antes de crear uno nuevo.

### 400 Bad Request - Periodo Cerrado

```json
{
    "error": "No se puede eliminar un periodo cerrado."
}
```

**Solución**: Los periodos cerrados son inmutables.

### 400 Bad Request - Concepto de Sistema

```json
{
    "error": "No se puede eliminar un concepto de sistema."
}
```

**Solución**: Los conceptos marcados como `is_system=true` no pueden eliminarse.

---

## Referencias

- **Views Backend**: [payroll_core/views.py](file:///c:/Desarrollo/RRHH/payroll_core/views.py)
- **Serializers**: [payroll_core/serializers.py](file:///c:/Desarrollo/RRHH/payroll_core/serializers.py)
- **OpenAPI Spec**: [openapi.yaml](./openapi.yaml)
- **React Query Hooks**: [hooks.md](./hooks.md)

---

*© 2026 NÓMINIX Suite — Guía de Desarrollo API V2.0.0*
