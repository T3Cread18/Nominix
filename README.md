# 🇻🇪 Nóminix Suite - Gestión de RRHH Multi-Tenant

**Nóminix** es una plataforma SaaS (Software as a Service) de alto rendimiento diseñada para la gestión integral de Recursos Humanos y Nómina, optimizada específicamente para el marco legal y financiero de la República Bolivariana de Venezuela (LOTTT, IVSS, FAOV).

![Banner](https://img.shields.io/badge/Status-Development-orange?style=for-the-badge)
![Tech](https://img.shields.io/badge/Backend-Django_5.0-green?style=for-the-badge&logo=django)
![Tech](https://img.shields.io/badge/Frontend-React_18-blue?style=for-the-badge&logo=react)
![Architecture](https://img.shields.io/badge/Architecture-Multi--Tenant-blueviolet?style=for-the-badge)

---

## 🏗️ Arquitectura del Sistema

El sistema utiliza una arquitectura desacoplada con aislamiento total de datos:

### 🖥️ Backend (Python/Django)
- **Multi-tenancy**: Implementado mediante esquemas de PostgreSQL (`django-tenants`). Cada cliente tiene su propio esquema, lo que garantiza seguridad y cumplimiento normativo.
- **RESTful API**: Desarrollada con Django REST Framework, sirviendo como núcleo de lógica de negocio.
- **Motor de Nómina**: Clase `PayrollEngine` que evalúa fórmulas dinámicas en Python seguro (`simple-eval`).
- **Sincronización BCV**: Integración automatizada con las tasas del Banco Central de Venezuela.

### 🎨 Frontend (React/Vite)
- **Modern UI**: Estética premium "Electric Dark" con Tailwind CSS.
- **Feature-Based Structure**: Organización modular por funcionalidades (HR, Payroll, Loans, Tenants).
- **Responsive Management**: Gestión de estados compleja para recibos, simulaciones y catálogos interactivos.

---

## ✨ Características Principales

### 💎 Core Business Logic
- **Snapshotting de Nómina**: Al cerrar un periodo, el sistema guarda una "fotografía" inmutable de contratos, salarios y tasas de cambio para auditoría histórica.
- **Catálogo de Conceptos Inteligente**: Gestión de asignaciones y deducciones con soporte para fórmulas personalizadas.
- **Gestión de Préstamos**: Seguimiento automatizado de cuotas y saldos deudor de empleados.
- **Contratos Multimoneda**: Soporte nativo para salarios pactados en divisas con liquidación en moneda local.

### ⚖️ Adaptación Legal (Venezuela)
- **Validaciones**: RIF (J-12345678-9) y Cédula (V/E).
- **Leyes Sociales**: Automatización de IVSS (Seguro Social), FAOV (Vivienda), RPE (Paro Forzoso) e INCES.
- **Cestaticket**: Cálculo automático ajustado a decretos vigentes.

---

## 📁 Estructura del Código

### Backend Structure
```bash
├── rrhh_saas/          # Configuración global y settings del proyecto
├── customers/          # App compartida (Admin de Tenants, Dominios, Auth)
├── payroll_core/       # App de negocio (Ejecutada en cada esquema de tenant)
│   ├── engine.py       # El "Corazón": Motor de cálculo de nómina
│   ├── formulas.py     # Definiciones de leyes laborales
│   ├── models/         # Employee, contract, currency, payroll, loans
│   └── services/       # Integración BCV, Inicialización, Snapshots
├── scripts/            # Herramientas de administración y despliegue
```

### Frontend Structure (`nominix-web/`)
```bash
├── src/
│   ├── api/            # Configuración de Axios y interceptores
│   ├── features/       # Módulos funcionales (HR, Payroll, Auth...)
│   │   ├── hr/         # Directorio de personal y expedientes
│   │   ├── payroll/    # Tablero de control, Catálogo y Cierres
│   │   └── loans/      # Gestión de préstamos
│   ├── components/     # UI reusable (Buttons, Modals, Tables)
│   └── store/          # Contextos de React para estado global
```

---

## 🚀 Instalación y Despliegue

### Requisitos Previos
- Docker y Docker Compose
- *Opcional*: Python 3.12+ / Node.js 20+

### Despliegue con Docker (Recomendado)
```bash
# 1. Clonar el repositorio
git clone <url-repo>

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar servicios
docker-compose up --build
```

### Inicialización del Sistema
```bash
# Crear el tenant principal (public)
docker-compose exec backend python manage.py migrate_schemas --shared

# Inicializar conceptos de sistema para un tenant
docker-compose exec backend python manage.py tenant_command create_system_concepts --schema=nombre_empresa
```

---

## 📡 API Endpoints Clave

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/tenant-info/` | Metadatos de la empresa actual (Logo, Nombre) |
| `POST /api/payroll/validate-formula/` | Tester en tiempo real para fórmulas Python |
| `GET /api/employees/{id}/simulate-payslip/` | Cálculo preventivo de recibo de pago |
| `POST /api/payroll-periods/{id}/close/` | Cierre definitivo e inmutable de nómina |

---

## � Guía de Desarrollo

### Comandos de Utilidad (Backend)
- **Sincronizar BCV**: `python manage.py tenant_command fetch_bcv_rates --schema=tu_empresa`
- **Crear Superusuario**: `python manage.py tenant_command createsuperuser --schema=tu_empresa`

### Estándares de Diseño
Garantizar que todos los componentes nuevos sigan el **Design System** definido en `index.css`:
- Colores base: `#000000` (Dark), `#CCFF00` (Electric Green).
- Tipografía: Inter / Outfit.

---

## 🧠 Auditoría Avanzada: Motor de Nómina (`PayrollEngine`)

El motor de Nóminix ha sido diseñado bajo principios de **Inmutabilidad**, **Transparencia** y **Seguridad**. A diferencia de sistemas contables tradicionales, Nóminix procesa la nómina como un flujo de estados evaluados en tiempo real.

### 🔑 Mecanismos de Cálculo
El proceso se divide en cinco fases críticas ejecutadas de forma atómica:

1.  **Contextualización (Build Context)**: Se genera un diccionario de variables (Snapshot de Datos Maestros) que incluye desde el salario hasta el conteo de lunes del mes según el calendario real de Venezuela.
2.  **Partición Salarial (Contract Phase)**: Utiliza `SalarySplitter` para desglosar el "Total Package" en Salario Base, Cestaticket (Social) y Complemento, respetando la frecuencia (Quincenal/Mensual).
3.  **Evaluación Dinámica (Dynamic Phase)**: Procesa reglas de negocio personalizadas. Prioriza: `Novedad Manual` > `Ajuste por Empleado` > `Valor Global`.
4.  **Cálculo de Ley (Law Phase)**: Inyecta deducciones obligatorias (IVSS, FAOV, RPE) con lógica de topes (5 y 10 Salarios Mínimos) hardcodeada para evitar manipulaciones accidentales.
5.  **Liquidación de Préstamos**: Descuenta automáticamente cuotas de préstamos activos, gestionando saldos y conversiones de divisas en el momento del cobro.

### 🛡️ Seguridad y Robustez
-   **Safe Evaluation**: Las fórmulas de usuario no se ejecutan como código Python crudo. Se filtran a través de `simple-eval`, permitiendo solo operadores matemáticos y funciones seguras (`min`, `max`, `round`).
-   **Trazabilidad Total**: Cada línea calculada (`PayslipDetail`) almacena un `trace` (la fórmula expandida con valores reales) y un mapa de variables. Esto permite reconstruir el cálculo semanas después sin ambigüedades.
-   **Aislamiento Monetario**: El motor opera internamente con `Decimal` de alta precisión (18,6 para tasas y 12,2 para montos), evitando errores de flotantes comunes en JavaScript.

### 📊 Inventario de Variables (Resumen Auditado)
| Variable | Origen | Descripción |
| :--- | :--- | :--- |
| `SALARIO_MENSUAL` | Contrato | Base de cálculo mensual en VES. |
| `LUNES` | Calendario | Conteo real de lunes en el periodo (Base IVSS). |
| `ANTIGUEDAD` | RRHH | Años de servicio para bonos de antigüedad. |
| `DIAS_HABILES` | Calendario | Días lunes-viernes efectivos en el periodo. |
| `NOVEDADES_*` | Incidencias | Variables inyectadas desde el panel de novedades (Ej: Horas Extra). |

---

## 📄 Licencia y Créditos

© 2025 **Nóminix Suite**. Todos los derechos reservados.
Desarrollado para la modernización de los procesos de capital humano en Venezuela. 🇻🇪
