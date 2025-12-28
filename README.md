# 🇻🇪 Sistema RRHH Multi-Tenant para Venezuela

Sistema SaaS de gestión de Recursos Humanos y Nómina adaptado a la legislación laboral venezolana.
Utiliza Django 5.x con arquitectura multi-tenant basada en esquemas de PostgreSQL.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [API REST](#-api-rest)
- [Modelos](#-modelos)
- [Servicios](#-servicios)
- [Scripts Útiles](#-scripts-útiles)
- [Comandos Django](#-comandos-django)

---

## ✨ Características

### Multi-Tenancy
- Aislamiento completo de datos por esquema PostgreSQL
- Cada empresa/farmacia tiene su propia base de datos virtual
- Gestión centralizada de tenants via API REST

### Adaptado a Venezuela
- **RIF**: Validación formato J-12345678-9
- **Cédula**: Formato V-12345678 / E-12345678
- **IVSS**: Código del Seguro Social
- **FAOV**: Código Banavih (Fondo de Vivienda)
- **Tasas de cambio**: Soporte BCV con 6 decimales
- **Zona horaria**: America/Caracas

### API REST
- CRUD completo de tenants
- Gestión de dominios por tenant
- Estadísticas del sistema
- Autenticación y permisos

---

## 🛠️ Tecnologías

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Python | 3.12+ | Lenguaje principal |
| Django | 5.0 | Framework web |
| Django REST Framework | 3.14 | API REST |
| django-tenants | 3.6 | Multi-tenancy |
| PostgreSQL | 12+ | Base de datos |
| psycopg2/psycopg | 2.9/3.x | Driver PostgreSQL |

> ⚠️ **Importante**: Python 3.14 tiene incompatibilidades con Django. Usar Python 3.12 o 3.13.

---

## 📁 Estructura del Proyecto

```
c:\Desarrollo\RRHH\
├── manage.py                 # Script de administración Django
├── requirements.txt          # Dependencias del proyecto
├── .env.example              # Plantilla de configuración
├── .gitignore                # Archivos ignorados por Git
│
├── rrhh_saas/                # ⚙️ Configuración del proyecto
│   ├── __init__.py
│   ├── settings.py           # Configuración Django + django-tenants
│   ├── urls.py               # URLs principales
│   └── wsgi.py               # Punto de entrada WSGI
│
├── customers/                # 📦 APP COMPARTIDA (Schema Public)
│   ├── models.py             # Client, Domain
│   ├── serializers.py        # Serializers para API
│   ├── views.py              # ViewSets de la API
│   ├── urls.py               # Rutas de la API
│   └── admin.py              # Interfaz de administración
│
├── payroll_core/             # 📦 APP TENANT (Schema por Empresa)
│   ├── models.py             # Currency, ExchangeRate, Employee, LaborContract
│   ├── services.py           # SalaryConverter, EmployeeService
│   ├── admin.py              # Interfaz de administración
│   └── urls.py               # Rutas de la API (pendiente)
│
├── scripts/                  # 🔧 Scripts de utilidad
│   ├── create_tenants.py     # Crear tenants iniciales
│   ├── delete_tenant.py      # Eliminar tenant
│   └── check_schemas.py      # Verificar esquemas PostgreSQL
│
├── templates/                # Plantillas HTML
└── static/                   # Archivos estáticos
```

---

## 🚀 Instalación

### 1. Prerrequisitos

- Python 3.12 o 3.13 (NO usar 3.14)
- PostgreSQL 12+
- Git

### 2. Clonar y Configurar

```powershell
# Clonar repositorio
git clone <url-del-repo>
cd RRHH

# Crear entorno virtual con Python 3.12
py -3.12 -m venv venv

# Activar entorno (Windows PowerShell)
.\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Configurar Base de Datos

Crear la base de datos en PostgreSQL:
```sql
CREATE DATABASE rrhh_saas;
```

### 4. Configurar Variables de Entorno

Editar `rrhh_saas/settings.py` líneas 113-122:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': 'rrhh_saas',
        'USER': 'postgres',
        'PASSWORD': 'TU_PASSWORD',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 5. Ejecutar Migraciones

```powershell
# IMPORTANTE: Configurar encoding en Windows
$env:PGCLIENTENCODING='UTF8'

# Crear migraciones
python manage.py makemigrations customers payroll_core

# Migrar esquema público
python manage.py migrate_schemas --shared

# Crear tenant público
python create_tenants.py

# Migrar esquemas de tenants
python manage.py migrate_schemas --tenant

# Crear superusuario
python manage.py createsuperuser
```

### 6. Iniciar Servidor

```powershell
$env:PGCLIENTENCODING='UTF8'
python manage.py runserver
```

Acceder a:
- **Admin**: http://localhost:8000/admin/
- **API**: http://localhost:8000/api/

---

## ⚙️ Configuración

### Variable de Entorno Windows

**Siempre ejecutar antes de comandos Django:**
```powershell
$env:PGCLIENTENCODING='UTF8'
```

Esto evita el error `UnicodeDecodeError` con PostgreSQL en Windows.

### Configuración de Tenants

| Configuración | Valor |
|---------------|-------|
| `TENANT_MODEL` | `customers.Client` |
| `TENANT_DOMAIN_MODEL` | `customers.Domain` |
| `SHARED_APPS` | django_tenants, customers, auth, admin... |
| `TENANT_APPS` | payroll_core, auth, admin... |

---

## 📡 API REST

### Endpoints de Tenants

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/tenants/` | Listar todos los tenants |
| `POST` | `/api/tenants/` | Crear nuevo tenant |
| `GET` | `/api/tenants/{id}/` | Obtener detalle |
| `PUT` | `/api/tenants/{id}/` | Actualizar tenant |
| `DELETE` | `/api/tenants/{id}/` | Eliminar tenant y esquema |
| `GET` | `/api/tenants/stats/` | Estadísticas del sistema |
| `POST` | `/api/tenants/{id}/add_domain/` | Agregar dominio |
| `DELETE` | `/api/tenants/{id}/remove_domain/` | Eliminar dominio |
| `GET` | `/api/tenant-info/` | Info del tenant actual |

### Crear Tenant (Ejemplo)

```bash
curl -X POST http://localhost:8000/api/tenants/ \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "name": "Farmacia Central",
    "rif": "J-12345678-9",
    "domain": "central.localhost",
    "email": "admin@farmacia.com"
  }'
```

### Respuesta
```json
{
  "message": "Tenant 'Farmacia Central' creado exitosamente",
  "tenant": {
    "id": 2,
    "schema_name": "farmacia_central",
    "name": "Farmacia Central",
    "rif": "J-12345678-9",
    "domains": [
      {"id": 2, "domain": "central.localhost", "is_primary": true}
    ]
  }
}
```

---

## 📊 Modelos

### Esquema Public

#### Client (TenantMixin)
```python
- schema_name: str       # Nombre del esquema PostgreSQL
- name: str              # Nombre de la empresa
- rif: str               # RIF venezolano (J-12345678-9)
- email: str             # Email de contacto
- phone: str             # Teléfono
- address: str           # Dirección
- on_trial: bool         # En período de prueba
- paid_until: date       # Fecha vencimiento suscripción
- created_on: datetime   # Fecha de registro
```

#### Domain (DomainMixin)
```python
- domain: str            # Dominio/subdominio
- tenant: ForeignKey     # Referencia al Client
- is_primary: bool       # Dominio principal
```

### Esquema Tenant

#### Currency
```python
- code: str (PK)         # Código ISO (USD, VES)
- name: str              # Nombre (Bolívar Digital)
- symbol: str            # Símbolo ($, Bs.)
- is_base_currency: bool # Moneda de reporte
```

#### ExchangeRate
```python
- currency: FK           # Moneda origen
- rate: Decimal(18,6)    # Tasa con 6 decimales
- date_valid: datetime   # Fecha/hora de validez
- source: str            # BCV, MONITOR, PARALELO
```

#### Employee
```python
- first_name: str        # Nombres
- last_name: str         # Apellidos
- national_id: str       # Cédula (V-12345678)
- rif: str               # RIF personal
- ivss_code: str         # Código IVSS
- faov_code: str         # Código FAOV/Banavih
- hire_date: date        # Fecha de ingreso
- is_active: bool        # Activo
```

#### LaborContract
```python
- employee: FK           # Empleado
- salary_amount: Decimal # Monto del salario
- salary_currency: FK    # Moneda (USD típicamente)
- payment_frequency: str # WEEKLY, BIWEEKLY, MONTHLY
- is_active: bool        # Contrato vigente
```

---

## 🔧 Servicios

### SalaryConverter

Conversión de salarios entre monedas usando tasas del BCV:

```python
from payroll_core.services import SalaryConverter
from decimal import Decimal
from datetime import date

# Convertir USD a VES
amount_ves = SalaryConverter.convert_to_local(
    amount=Decimal('500.00'),
    currency_code='USD',
    target_date=date.today(),
    source='BCV'
)
print(f"Bs. {amount_ves:,.2f}")
```

### EmployeeService

Operaciones comunes sobre empleados:

```python
from payroll_core.services import EmployeeService

# Empleados activos
employees = EmployeeService.get_active_employees()

# Total de nómina
total, count = EmployeeService.calculate_total_payroll(date.today(), 'BCV')
```

---

## 📜 Scripts Útiles

### Verificar Esquemas
```powershell
$env:PGCLIENTENCODING='UTF8'
python check_schemas.py
```

### Crear Tenants Iniciales
```powershell
python create_tenants.py
```

### Eliminar Tenant
```powershell
python delete_tenant.py <schema_name>
```

---

## 🎮 Comandos Django

```powershell
# Configurar encoding (SIEMPRE primero en Windows)
$env:PGCLIENTENCODING='UTF8'

# Servidor de desarrollo
python manage.py runserver

# Crear migraciones
python manage.py makemigrations

# Migrar esquema público
python manage.py migrate_schemas --shared

# Migrar esquemas de tenants
python manage.py migrate_schemas --tenant

# Migrar un tenant específico
python manage.py migrate_schemas --schema=farmacia_central

# Crear superusuario
python manage.py createsuperuser

# Shell de Django
python manage.py shell

# Verificar configuración
python manage.py check
```

---

## 📝 Notas Importantes

1. **Python 3.14**: NO compatible con Django 5.0. Usar 3.12 o 3.13.

2. **Encoding Windows**: Siempre ejecutar `$env:PGCLIENTENCODING='UTF8'` antes de comandos.

3. **Tenant Público**: El esquema `public` NO debe eliminarse.

4. **Dominios Locales**: Para probar subdominios, agregar al archivo hosts:
   ```
   127.0.0.1 central.localhost
   127.0.0.1 demo.localhost
   ```

---

## 📄 Licencia

Proyecto privado - Todos los derechos reservados.

---

Desarrollado para el mercado venezolano 🇻🇪
