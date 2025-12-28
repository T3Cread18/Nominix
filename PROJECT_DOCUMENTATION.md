# Nóminix Suite - Documentación Técnica del Proyecto (V1.2.0)

Nóminix es una plataforma SaaS (Software as a Service) modular diseñada para la gestión integral de Recursos Humanos y Nómina, optimizada específicamente para el marco legal de la República Bolivariana de Venezuela (LOTTT, IVSS, FAOV).

- **Cierre e Inmutabilidad**: Proceso de "snapshotting" que congela los datos financieros en periodos cerrados para auditoría legal.

---

## 🏗️ Arquitectura del Sistema

### Capa de Backend (Django 5.0)
- **Multi-tenancy**: Implementado mediante `django-tenants`. Cada empresa posee su propio esquema de base de datos (PostgreSQL), garantizando aislamiento total de la data.
- **API Engine**: Django REST Framework (DRF) sirve una API puramente relacional.
- **Motor de Cálculo**: Clase `PayrollEngine` que abstrae la complejidad de las fórmulas legales y conversiones de divisas.

### Capa de Frontend (Vite + React 18)
- **Design System**: UI Premium basada en Tailwind CSS con una estética "Electric Dark".
- **Estado Global**: Manejo de autenticación y sesiones vía React Context.
- **Comunicación**: Axios configurado con soporte para multi-subdominio y protección CSRF nativa de Django.

---

## ⚖️ Motor de Nómina y Fórmulas Legales

El motor procesa conceptos basados en el salario configurado en el `LaborContract` y la tasa del día de `ExchangeRate`.

### 1. Métodos de Cálculo
| Método | Descripción | Ejemplo |
|:--- |:--- |:--- |
| `FIXED_AMOUNT` | Monto absoluto en una moneda específica. | Bono Alimentación (40 USD) |
| `PERCENTAGE_OF_BASIC` | % calculado sobre el sueldo base del contrato. | Bono Profesionalización (5%) |
| `FORMULA` | Lógica compleja inyectada desde `formulas.py`. | Retención IVSS |

### 2. Especificación de Fórmulas Legales (`formulas.py`)

#### A. Seguro Social (IVSS_VE)
- **Base**: `((Sueldo Mensual * 12 meses) / 52 semanas)`.
- **Tope**: 5 Salarios Mínimos (actualmente 130.00 VES x 5 = 650.00 VES).
- **Fórmula**: `Base Semanal * Cantidad de Lunes del Mes * 4%`.
- **Tipo**: Deducción.

#### B. Fondo de Ahorro Obligatorio (FAOV_VE)
- **Base**: Salario Integral/Base.
- **Fórmula**: `Sueldo VES * 1%`.
- **Tipo**: Deducción (Sin tope legal).

#### C. Horas Extra (H_EXTRA)
- **Base**: Valor Hora Diurna `((Sueldo / 30) / 8)`.
- **Recargo**: 50% sobre el valor hora.
- **Variable**: Requiere entrada `overtime_hours`.

#### D. Bono Nocturno (B_NOCTURNO)
- **Recargo**: 30% sobre el valor hora diurna.
- **Variable**: Requiere entrada `night_hours`.

---

## 🔒 Proceso de Cierre e Inmutabilidad (Novedad V1.2.5)

Para garantizar la integridad legal y auditoría, Nóminix separa la **Simulación** (tiempo real) de la **Persistencia** (histórico).

### 1. El Concepto de Snapshot (Instantánea)
Cuando se ejecuta el cierre de un periodo, el sistema no solo guarda los montos calculados, sino que realiza un **Snapshot de Datos Maestros**:
- **Copia del Contrato**: Se guarda un JSON con el salario, cargo y moneda pactada en ese momento exacto.
- **Tasa de Cambio**: Se registra la tasa BCV efectiva utilizada para la conversión.
- **Des-normalización de Conceptos**: Los renglones del recibo (`PayslipDetail`) guardan el nombre y código del concepto. Si el concepto global se borra o cambia de nombre en el futuro, los recibos antiguos permanecen idénticos.

### 2. Flujo de Cierre (`PayrollProcessor`)
El proceso es **atómico** (todo o nada) y sigue esta lógica:
1. Valida que el `PayrollPeriod` esté en estado `OPEN`.
2. Bloquea el periodo para evitar cálculos duplicados.
3. Ejecuta el `PayrollEngine` para cada empleado activo.
4. Genera el `Payslip` (Header) y múltiples `PayslipDetail` (Líneas).
5. Cambia el estado a `CLOSED`.

### 3. Endpoints de Histórico
- `GET /api/payroll-periods/`: Listado de periodos (Quincenas/Meses).
- `POST /api/payroll-periods/{id}/close/`: Ejecuta el cierre definitivo.
- `GET /api/payslips/`: Consulta de recibos estáticos generados. Soporta filtrado por empleado y periodo.

---

## 🔌 Referencia de la API (Endpoints)

### Autenticación y Tenant (Global)
- `GET /api/tenant-info/`: Obtiene metadatos de la empresa actual (logo, nombre, esquema).
- `POST /api/auth/login/`: Autentica al usuario en el esquema correspondiente.
- `POST /api/auth/logout/`: Cierra la sesión activa.
- `GET /api/auth/me/`: Devuelve el perfil del usuario autenticado.

### Gestión de Recursos Humanos (HR)
- `GET/POST /api/employees/`: Listado y registro de trabajadores.
- `GET/PUT/PATCH/DELETE /api/employees/{id}/`: Gestión de expediente individual.
- `GET/POST /api/employees/{id}/simulate-payslip/`: **Endpoint Crítico**. Realiza el cálculo real de la nómina para un empleado, permitiendo inyectar variables (horas extra, faltas).
- `GET/POST /api/branches/`: Gestión de sedes/sucursales físicas.

### Contratos y Conceptos
- `GET/POST /api/contracts/`: Gestión de contratos laborales (Salario, Cargo, Moneda). Un empleado solo tiene un contrato activo a la vez.
- `GET/POST /api/payroll-concepts/`: Catálogo global de reglas de nómina.
- `GET/POST /api/employee-concepts/`: Asignaciones específicas por empleado (CRUD para bonos personalizados o deducciones únicas).
- `GET/POST /api/currencies/`: Maestro de monedas (VES, USD).

---

## 👥 Módulos del Frontend

### 1. Directorio de Personal (`PersonnelManager`)
Visualización de la nómina activa en formato tabular con búsqueda avanzada. Al hacer clic, despliega la **Ficha 360°**.

### 2. Expediente Electrónico (`EmployeeDetail`)
Panel lateral (Drawer) que permite:
- **Perfil**: Datos básicos y de contacto.
- **Contrato**: Visualización del cargo, salario en USD/VES y antigüedad.
- **Conceptos**: Gestión interactiva (CRUD) de bonos y deducciones específicos del trabajador.

### 3. Configurador Global (`ConceptCatalog`)
Centro de mando para RRHH donde se definen los códigos contables y las leyes que rigen la nómina de toda la empresa.

### 4. Simulador de Nómina (`PayslipSimulator`)
Permite visualizar el recibo de pago proyectado, calculando netos a pagar y referencias en divisas en tiempo real.

---

## 🛠️ Stack Tecnológico
- **Base de Datos**: PostgreSQL 15+
- **Lenguaje**: Python 3.11 / JavaScript (ES6+)
- **Backend Framework**: Django 5.0 + DRF
- **Frontend Framework**: React 18 (Vite)
- **Estilos**: Tailwind CSS + Lucide Icons
- **Servidor**: Gunicorn / Nginx

## 📈 Automatización de Tasas (BCV) - Novedad V1.2.6

El sistema se sincroniza con las tasas oficiales del **Banco Central de Venezuela** de forma automatizada, garantizando que los cálculos de nómina reflejen la realidad cambiaria.

- **Servicio**: `BCVRateService` en `payroll_core/services.py`.
- **API Utilizada**: `https://bcvapi.onrender.com/` (USD y EUR).
- **Consumo**: Realiza peticiones HTTP cada vez que se invoca el comando de actualización.
- **Comando de Sincronización**:
  ```bash
  python manage.py tenant_command fetch_bcv_rates --schema=nombre_del_tenant
  ```
Este comando actualiza el histórico de `ExchangeRate` para el día actual. Se recomienda programarlo como una tarea programada (Cron Job) dos veces al día.

---

© 2025 NÓMINIX - Documento de Referencia Técnica.
