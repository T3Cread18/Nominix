# 📚 Nóminix Suite — Documentación Completa del Sistema

> **Plataforma SaaS Multi-Tenant de Gestión de Nómina y Recursos Humanos para Venezuela**  
> Versión: 2.0.0 | Última Actualización: Enero 2026

---

## Índice General

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Backend (Django)](#5-backend-django)
6. [Modelos de Datos](#6-modelos-de-datos)
7. [Motor de Nómina (PayrollEngine)](#7-motor-de-nómina-payrollengine)
8. [Ingeniería Salarial](#8-ingeniería-salarial)
9. [Prestaciones Sociales (LOTTT)](#9-prestaciones-sociales-lottt)
10. [Frontend (React)](#10-frontend-react)
11. [API REST](#11-api-rest)
12. [Multi-Tenancy](#12-multi-tenancy)
13. [Flujos de Operación](#13-flujos-de-operación)
14. [Seguridad](#14-seguridad)
15. [Comandos y Despliegue](#15-comandos-y-despliegue)

---

## 1. Resumen Ejecutivo

Nóminix es una plataforma diseñada para la gestión integral de nómina y recursos humanos en Venezuela, con cumplimiento total de la **LOTTT** (Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras).

### Características Principales

| Módulo | Funcionalidad |
|--------|---------------|
| **Empleados** | Registro completo, contratos laborales, datos bancarios, histórico |
| **Nómina** | Cálculo dinámico con fórmulas personalizables, conceptos configurables |
| **Prestaciones** | Garantía trimestral, días adicionales, intereses, liquidaciones |
| **Préstamos** | Gestión completa y deducción automática en nómina |
| **Multi-Moneda** | Operación nativa USD/VES con integración a tasa BCV |
| **Multi-Tenant** | Aislamiento completo por schema PostgreSQL |
| **Ingeniería Salarial** | Partición sueldo base/complemento para optimización |

---

## 2. Stack Tecnológico

### Backend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Runtime | Python | 3.11+ |
| Framework | Django | 5.x |
| API Layer | Django REST Framework | 3.14+ |
| Multi-Tenancy | django-tenants | 3.6+ |
| Fórmulas Dinámicas | simpleeval | 0.9.13 |
| Generación PDF | WeasyPrint | 60.0+ |
| Exportación Datos | openpyxl, pandas | Latest |
| Scraping BCV | requests, BeautifulSoup | Latest |

### Frontend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Estado Servidor | TanStack Query | 5.x |
| Formularios | React Hook Form | 7.x |
| Routing | React Router | 6.x |
| HTTP Client | Axios | 1.x |
| Charts | Recharts | 2.x |
| Estilos | TailwindCSS | 3.x |

### Infraestructura

| Componente | Tecnología |
|------------|------------|
| Containerization | Docker + Docker Compose |
| Base de Datos | PostgreSQL 15+ |
| Web Server | Nginx (reverse proxy) |
| WSGI Server | Gunicorn |
| SSL/TLS | Let's Encrypt |

---

## 3. Arquitectura del Sistema

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Tenant A   │ │   Tenant B   │ │   Tenant N   │            │
│  │ empresa-a.   │ │ empresa-b.   │ │     ...      │            │
│  │nominix.com.ve│ │nominix.com.ve│ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18 + Vite)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Features   │ │    Hooks    │ │ Components  │               │
│  │ (Módulos)   │ │(TanStack Q) │ │    (UI)     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Django 5.x + DRF)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  API REST   │ │PayrollEngine│ │SocialBenefits│              │
│  │  ViewSets   │ │   (Motor)   │ │   Engine    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ┌──────────────────────────────────────────────┐              │
│  │          Multi-Tenant Middleware             │              │
│  └──────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (PostgreSQL)                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │   public   │ │  tenant_a  │ │  tenant_b  │                  │
│  │  (shared)  │ │  (schema)  │ │  (schema)  │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                           │
│  ┌────────────────────────────────────────┐                    │
│  │        BCV API (Tasas de Cambio)       │                    │
│  └────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Patrón de Capas

```
┌─────────────────────────────────────────┐
│     🎨 Presentación (Views/ViewSets)    │  ← API REST
├─────────────────────────────────────────┤
│          📄 Serializers (DRF)           │  ← Validación/Transformación
├─────────────────────────────────────────┤
│     ⚙️ Servicios (Business Logic)       │  ← PayrollEngine, SalarySplitter
├─────────────────────────────────────────┤
│         💾 Modelos (Django ORM)         │  ← Acceso a datos
└─────────────────────────────────────────┘
```

---

## 4. Estructura del Proyecto

```
c:\Desarrollo\RRHH\
├── rrhh_saas/                  # Configuración Django principal
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── customers/                   # App multi-tenancy
│   ├── models.py               # Tenant, Domain
│   └── views.py
├── payroll_core/               # App principal de nómina
│   ├── models/                 # Modelos organizados por dominio
│   │   ├── __init__.py
│   │   ├── employee.py         # Employee, LaborContract
│   │   ├── organization.py     # Company, Branch, Department, JobPosition
│   │   ├── concepts.py         # PayrollConcept, EmployeeConcept
│   │   ├── payroll.py          # PayrollPeriod, PayrollReceipt, PayrollNovelty
│   │   ├── social_benefits.py  # SocialBenefitsLedger, Settlement
│   │   ├── loans.py            # Loan, LoanPayment
│   │   └── currency.py         # ExchangeRate
│   ├── services/               # Lógica de negocio
│   │   ├── salary.py           # SalarySplitter
│   │   ├── currency.py         # BCVRateService
│   │   ├── payroll.py          # PayrollProcessor
│   │   └── social_benefits_engine.py
│   ├── engine.py               # PayrollEngine (~1,140 líneas)
│   ├── formulas.py             # Fórmulas predefinidas
│   ├── views.py                # ViewSets (~1,000 líneas)
│   ├── serializers.py          # Serializadores DRF
│   └── urls.py                 # Rutas de la app
├── shared/                      # Modelos compartidos (Currency, InterestRate)
├── templates/                   # Templates HTML (recibos PDF)
│   └── payroll/
│       └── payslip_batch.html
├── nominix-web/                # Frontend React
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js       # Axios interceptors
│   │   ├── components/         # Componentes UI reutilizables
│   │   │   ├── ui/             # Button, Card, Modal, Tabs, etc.
│   │   │   └── layout/         # Header, Sidebar, Layout
│   │   ├── features/           # Módulos por dominio
│   │   │   ├── auth/           # Login, autenticación
│   │   │   ├── hr/             # Empleados, contratos
│   │   │   ├── payroll/        # Periodos, conceptos, novedades
│   │   │   ├── social-benefits/# Prestaciones sociales
│   │   │   ├── loans/          # Préstamos
│   │   │   ├── settings/       # Configuración empresa
│   │   │   └── tenants/        # Administración tenants
│   │   ├── hooks/              # React Query hooks
│   │   │   ├── useEmployees.js
│   │   │   ├── usePayroll.js
│   │   │   ├── useOrganization.js
│   │   │   └── useSocialBenefits.js
│   │   ├── utils/              # Funciones auxiliares
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── docs/                        # Documentación (este archivo)
├── docker-compose.yml
├── manage.py
└── requirements.txt
```

---

## 5. Backend (Django)

### Apps Principales

| App | Responsabilidad |
|-----|-----------------|
| `payroll_core` | Toda la lógica de nómina, empleados, conceptos |
| `customers` | Multi-tenancy (Tenant, Domain) |
| `shared` | Modelos compartidos entre tenants |

### Servicios (services/)

| Servicio | Archivo | Funcionalidad |
|----------|---------|---------------|
| **SalarySplitter** | `salary.py` | Partición de salario base/complemento |
| **BCVRateService** | `currency.py` | Obtención de tasas BCV via scraping |
| **PayrollProcessor** | `payroll.py` | Procesamiento batch de periodos |
| **SocialBenefitsEngine** | `social_benefits_engine.py` | Cálculos de prestaciones LOTTT |

### ViewSets Principales

| ViewSet | Endpoint Base | Funcionalidad |
|---------|---------------|---------------|
| `EmployeeViewSet` | `/api/employees/` | CRUD empleados + simulación |
| `LaborContractViewSet` | `/api/contracts/` | Gestión de contratos |
| `PayrollPeriodViewSet` | `/api/payroll-periods/` | Periodos + cierre + export |
| `PayrollConceptViewSet` | `/api/payroll-concepts/` | Configuración conceptos |
| `SocialBenefitsLedgerViewSet` | `/api/social-benefits/ledger/` | Libro mayor prestaciones |
| `LoanViewSet` | `/api/loans/` | Gestión préstamos |

---

## 6. Modelos de Datos

### Diagrama ER Principal

```
Company (1) ────────── (1) PayrollPolicy
    │
    └──── (N) Branch
              │
              └──── (N) Department
                        │
                        └──── (N) JobPosition
                                    │
Employee (1) ────────── (N) LaborContract ──── (1) JobPosition
    │                           │
    │                           └──── (N) PayrollReceipt
    │                                         │
    │                                         └──── (N) PayrollReceiptLine
    │
    └──── (N) PayrollNovelty
    │
    └──── (N) Loan ──── (N) LoanPayment
    │
    └──── (N) SocialBenefitsLedger
    │
    └──── (1) SocialBenefitsSettlement

PayrollPeriod (1) ──── (N) PayrollReceipt
                 │
                 └──── (N) PayrollNovelty

PayrollConcept (1) ──── (N) PayrollReceiptLine
               │
               └──── (N) EmployeeConcept
```

### Modelos Clave

#### Employee (Empleado)
```python
class Employee(models.Model):
    # Identificación
    first_name, last_name, national_id  # V-12345678
    id_type                             # V=Venezolano, E=Extranjero
    birth_date, gender, marital_status
    
    # Venezuela
    rif, ivss_code, faov_code
    
    # Laboral (denormalizado para acceso rápido)
    branch, department, position
    hire_date, termination_date, is_active
    
    # Bancario
    bank_name, bank_account_type, bank_account_number
    
    @property
    def seniority_years(self):
        """Años de antigüedad cumplidos"""
```

#### LaborContract (Contrato Laboral)
```python
class LaborContract(models.Model):
    employee                    # FK Employee
    position                    # FK JobPosition
    branch                      # FK Branch
    
    contract_type               # INDEFINIDO, DETERMINADO, OBRA
    payment_frequency           # QUINCENAL, MENSUAL, SEMANAL
    start_date, end_date
    is_active                   # Solo 1 activo por empleado
    
    salary_amount               # Monto del salario
    salary_currency             # FK Currency (USD)
    total_salary_override       # Override opcional del total
```

#### PayrollConcept (Concepto de Nómina)
```python
class PayrollConcept(models.Model):
    code                        # Código único (SUELDO_BASE)
    name                        # Nombre descriptivo
    
    kind                        # EARNING, DEDUCTION
    behavior                    # SALARY_BASE, LAW_DEDUCTION, DYNAMIC, etc.
    computation_method          # FIXED, PERCENTAGE, FORMULA
    
    formula                     # Fórmula dinámica (simpleeval)
    fixed_amount                # Para montos fijos
    percentage_value            # Para porcentajes
    currency                    # FK Currency
    
    incidences                  # JSON: acumuladores afectados
    system_params               # JSON: parámetros específicos
    
    appears_on_receipt          # ¿Mostrar en recibo?
    receipt_order               # Orden de aparición
    tipo_recibo                 # salario, complemento, cestaticket
    
    active, is_system           # Control de estado
```

#### PayrollPeriod (Periodo de Nómina)
```python
class PayrollPeriod(models.Model):
    name                        # "Enero 2026 - 1ra Quincena"
    period_type                 # Q1, Q2, M, E (Especial)
    start_date, end_date, payment_date
    status                      # DRAFT, OPEN, PROCESSING, CLOSED
    
    closed_at, closed_by, notes
```

#### SocialBenefitsLedger (Libro Mayor Prestaciones)
```python
class SocialBenefitsLedger(models.Model):
    """INMUTABLE - No se puede modificar ni eliminar"""
    employee, contract
    
    transaction_type            # GARANTIA, DIAS_ADIC, INTERES, ANTICIPO, etc.
    transaction_date
    
    basis_days                  # Días base del cálculo
    daily_salary_used           # Salario integral usado
    interest_rate_used          # Tasa (si aplica)
    
    previous_balance, amount, balance
    calculation_formula, calculation_trace
    
    # Auditoría
    created_at, created_by, ip_address
```

---

## 7. Motor de Nómina (PayrollEngine)

El `PayrollEngine` es el núcleo de cálculo, implementado en `payroll_core/engine.py` (~1,140 líneas).

### Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                     PayrollEngine                            │
├──────────────────────────────────────────────────────────────┤
│  contract: LaborContract                                     │
│  period: PayrollPeriod (opcional)                           │
│  payment_date: date                                         │
│  input_variables: Dict (novedades manuales)                 │
├──────────────────────────────────────────────────────────────┤
│  _build_eval_context() → dict                               │
│  calculate_payroll() → {lines, totals}                      │
│  calculate_concept() → Decimal                              │
│  _handle_salary_base() → line                               │
│  _handle_law_deduction() → line                             │
│  validate_formula() → validation_result                     │
│  get_variable_inventory() → variables_docs                  │
└──────────────────────────────────────────────────────────────┘
```

### Variables Disponibles en Fórmulas

#### Variables de Salario (USD)

| Variable | Descripción |
|----------|-------------|
| `SALARIO_MENSUAL` | Paquete total mensual |
| `SUELDO_BASE_MENSUAL` | Sueldo base (sin complemento) |
| `SUELDO_BASE_DIARIO` | Base/30 |
| `COMPLEMENTO_MENSUAL` | Bono no salarial |
| `SUELDO_BASE_PERIODO` | Base proporcional al periodo |
| `COMPLEMENTO_PERIODO` | Complemento proporcional |

#### Variables Temporales

| Variable | Descripción |
|----------|-------------|
| `DIAS` | Días totales del periodo |
| `DIAS_HABILES` | Días laborables |
| `DIAS_FERIADO` | Feriados nacionales |
| `LUNES` | Cantidad de lunes (base IVSS/FAOV) |

#### Variables del Empleado

| Variable | Descripción |
|----------|-------------|
| `ANTIGUEDAD` | Años de servicio completos |
| `ANTIGUEDAD_DIAS` | Días totales de antigüedad |
| `ANTIGUEDAD_MESES` | Meses residuales |

#### Variables de Sistema

| Variable | Descripción |
|----------|-------------|
| `TASA` / `TASA_BCV` | Tasa BCV USD/VES |
| `SALARIO_MINIMO` | Salario mínimo nacional (VES) |
| `MONTO_CESTATICKET` | Monto fijo cestaticket (USD) |

#### Acumuladores Dinámicos

| Variable | Descripción |
|----------|-------------|
| `TOTAL_IVSS_BASE` | Base acumulada para IVSS |
| `TOTAL_FAOV_BASE` | Base acumulada para FAOV |
| `TOTAL_ISLR_BASE` | Base acumulada para ISLR |
| `TOTAL_RPE_BASE` | Base Régimen Prestacional |

### Behaviors de Conceptos

| Behavior | Descripción | Handler |
|----------|-------------|---------|
| `SALARY_BASE` | Sueldo Base desglosable | `_handle_salary_base()` |
| `CESTATICKET` | Bono de alimentación | Inline |
| `COMPLEMENT` | Complemento salarial | Inline |
| `LAW_DEDUCTION` | Deducciones de ley | `_handle_law_deduction()` |
| `LOAN` | Descuento préstamo | Consulta Loan |
| `DYNAMIC` | Fórmula personalizada | simpleeval |
| `FIXED` | Monto fijo | `calculate_concept()` |

### Ejemplo de Uso

```python
from payroll_core.engine import PayrollEngine
from payroll_core.models import LaborContract
from datetime import date

contract = LaborContract.objects.get(
    employee__national_id='V-12345678',
    is_active=True
)

engine = PayrollEngine(
    contract=contract,
    payment_date=date(2026, 1, 15),
    input_variables={
        'FALTAS': 2,
        'H_EXTRA': 8,
    }
)

result = engine.calculate_payroll()

# result = {
#     'lines': [
#         {'code': 'SUELDO_BASE', 'amount_ves': 4181.25, 'kind': 'EARNING'},
#         {'code': 'IVSS', 'amount_ves': 167.25, 'kind': 'DEDUCTION'},
#         ...
#     ],
#     'totals': {
#         'total_earnings': 8500.00,
#         'total_deductions': 450.00,
#         'net_pay': 8050.00,
#     }
# }
```

---

## 8. Ingeniería Salarial

El `SalarySplitter` implementa la partición del salario en base + complemento.

### Modos de Distribución

| Modo | Fórmula |
|------|---------|
| `PERCENTAGE` | Base = Total × % configurado |
| `FIXED_BASE` | Base = Monto fijo del cargo |
| `FIXED_BONUS` | Complemento = Monto fijo, resto es base |

### Impacto en Cargas Laborales

| Concepto | Usa Base | Usa Total |
|----------|----------|-----------|
| IVSS (4%) | ✅ | ❌ |
| FAOV (1%) | ✅ | ❌ |
| RPE (0.5%) | ✅ | ❌ |
| Prestaciones Sociales | ✅ | ❌ |
| Utilidades | ✅ | ❌ |
| Bono Vacacional | ✅ | ❌ |
| Cestaticket | ❌ | (Monto fijo) |

### Configuración

```python
# En Company (empresa)
Company.salary_split_mode = 'FIXED_BASE'
Company.split_percentage_base = Decimal('30.00')

# En JobPosition (cargo)
JobPosition.split_fixed_amount = Decimal('130.00')  # USD
JobPosition.split_fixed_currency = 'USD'
```

---

## 9. Prestaciones Sociales (LOTTT)

### Marco Legal

| Artículo LOTTT | Concepto | Valor |
|----------------|----------|-------|
| Art. 122 | Salario Integral | Salario + Alícuota Util. + Alícuota Bono Vac. |
| Art. 131 | Utilidades | Mínimo 30 días anuales |
| Art. 142 | Garantía Trimestral | 15 días × Salario Integral |
| Art. 142 | Días Adicionales | 2 días × (Años - 1), máx 30/año |
| Art. 143 | Intereses | Tasa activa promedio BCV |
| Art. 192 | Bono Vacacional | Mínimo 15 días |

### Salario Integral Diario

```
Salario Integral = Salario Diario + Alícuota Utilidades + Alícuota Bono Vacacional

Donde:
- Salario Diario = Mensual / 30
- Alícuota Utilidades = (Mensual × 30) / 360
- Alícuota Bono Vacacional = (Mensual × 15) / 360
```

### Transacciones del Libro Mayor

| Tipo | Frecuencia | Descripción |
|------|------------|-------------|
| `GARANTIA` | Trimestral | 15 días × Salario Integral |
| `DIAS_ADIC` | Anual | Días adicionales por antigüedad |
| `INTERES` | Anual | Intereses sobre saldo (tasa BCV) |
| `ANTICIPO` | Variable | Anticipo de prestaciones |
| `LIQUIDACION` | Al terminar | Liquidación final |
| `REVERSAL` | Corrección | Reversión de transacción |

### Liquidación Final (Art. 142)

Se comparan dos métodos y se paga **el mayor**:

**Método A (Garantía):**
```
Neto = Total Garantía + Días Adicionales + Intereses - Anticipos
```

**Método B (Retroactivo):**
```
Monto = 30 días × Años de Servicio × Salario Integral Final
```

### Inmutabilidad del Ledger

```python
class SocialBenefitsLedger(models.Model):
    def save(self, *args, **kwargs):
        if self.pk:  # Ya existe
            raise ValueError("Los registros son INMUTABLES")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        raise ValueError("Los registros NO pueden eliminarse")
```

---

## 10. Frontend (React)

### Estructura de Features

```
src/features/
├── auth/           # Login, logout, sesiones
├── hr/             # Empleados, contratos
│   ├── pages/
│   │   ├── EmployeesPage.jsx
│   │   └── EmployeeFormPage.jsx
│   └── components/
│       ├── EmployeeList.jsx
│       ├── ContractCard.jsx
│       └── ContractList.jsx
├── payroll/        # Nómina
│   ├── pages/
│   │   ├── PayrollDashboard.jsx
│   │   └── PayrollPeriodDetail.jsx
│   └── components/
│       ├── PayrollPeriodList.jsx
│       ├── PayrollPreview.jsx
│       ├── ConceptFormBuilder.jsx
│       └── NoveltiesEditor.jsx
├── social-benefits/ # Prestaciones
│   └── components/
│       ├── SocialBenefitsTab.jsx
│       └── SettlementSimulator.jsx
├── loans/          # Préstamos
├── settings/       # Configuración
└── tenants/        # Administración tenants
```

### React Query Hooks

El estado del servidor se gestiona con TanStack Query:

```javascript
// Empleados
const { data, isLoading } = useEmployees({ search, branch, is_active });
const { data: employee } = useEmployee(id);
const { mutate: create } = useCreateEmployee();
const { data: simulation } = useSimulatePayslip(employeeId, novelties);

// Nómina
const { data: periods } = usePayrollPeriods({ status });
const { data: preview } = usePreviewPayroll(periodId, { manual_rate });
const { mutate: closePeriod } = useClosePeriod();
const { data: concepts } = usePayrollConcepts({ kind, active });

// Organización
const { data: branches } = useBranches();
const { data: departments } = useDepartments(branchId);
const { data: positions } = useJobPositions(departmentId);
const { data: config } = useCompanyConfig();

// Prestaciones
const { data: ledger } = useSocialBenefitsLedger(employeeId);
const { data: simulation } = useSettlementSimulation(employeeId, { termination_date });
```

### Query Keys para Invalidación

```javascript
employeeKeys.all              // ['employees']
employeeKeys.detail(id)       // ['employees', 'detail', 123]
payrollKeys.periods()         // ['payroll', 'periods']
payrollKeys.preview(id)       // ['payroll', 'preview', 5]
orgKeys.branches()            // ['organization', 'branches']
socialBenefitsKeys.ledger(id) // ['social-benefits', 'ledger', 123]
```

---

## 11. API REST

### Autenticación

| Método | Uso |
|--------|-----|
| Session + CSRF | Frontend web (Cookie-based) |
| Token | Integraciones terceros |

### Endpoints Principales

#### Empleados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/employees/` | Listar (paginado) |
| POST | `/api/employees/` | Crear |
| GET | `/api/employees/{id}/` | Obtener |
| PUT/PATCH | `/api/employees/{id}/` | Actualizar |
| DELETE | `/api/employees/{id}/` | Eliminar |
| GET/POST | `/api/employees/{id}/simulate-payslip/` | Simular nómina |

#### Periodos de Nómina

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/payroll-periods/` | Listar |
| POST | `/api/payroll-periods/` | Crear |
| GET | `/api/payroll-periods/{id}/preview-payroll/` | Vista previa |
| POST | `/api/payroll-periods/{id}/close-period/` | Cerrar periodo |
| GET | `/api/payroll-periods/{id}/export-pdf/` | Exportar PDF |

#### Prestaciones Sociales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/social-benefits/ledger/` | Listar movimientos |
| GET | `/api/social-benefits/balance/{emp}/` | Saldo actual |
| POST | `/api/social-benefits/settlement-simulation/` | Simular liquidación |
| POST | `/api/social-benefits/settlements/` | Crear liquidación |

#### Tasas de Cambio

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/exchange-rates/latest/` | Tasa más reciente |
| POST | `/api/exchange-rates/sync-bcv/` | Sincronizar con BCV |

### Ejemplos cURL

```bash
# Login
curl -X POST https://empresa.nominix.com.ve/api/auth/login/ \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "user@empresa.com", "password": "pass"}'

# Listar empleados
curl https://empresa.nominix.com.ve/api/employees/ -b cookies.txt

# Simular nómina
curl -X POST https://empresa.nominix.com.ve/api/employees/123/simulate-payslip/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: TOKEN" \
  -b cookies.txt \
  -d '{"FALTAS": 2, "H_EXTRA": 8}'

# Cerrar periodo
curl -X POST https://empresa.nominix.com.ve/api/payroll-periods/5/close-period/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: TOKEN" \
  -b cookies.txt \
  -d '{"manual_rate": 55.75}'
```

---

## 12. Multi-Tenancy

Implementación mediante `django-tenants` con aislamiento por schema PostgreSQL.

### Flujo de Identificación

```
Request → Host: empresa.nominix.com.ve
       → TenantMiddleware
       → SET search_path = schema_empresa
       → Procesar Request
```

### Tablas Compartidas (public schema)

| Tabla | Descripción |
|-------|-------------|
| `customers_tenant` | Registro de tenants |
| `customers_domain` | Dominios asociados |
| `shared_currency` | Monedas (USD, VES, EUR) |
| `shared_interestratebcv` | Tasas de interés BCV |

### Tablas Aisladas (tenant schema)

| Tabla | Descripción |
|-------|-------------|
| `payroll_core_employee` | Empleados del tenant |
| `payroll_core_laborcontract` | Contratos |
| `payroll_core_payrollperiod` | Periodos |
| `payroll_core_payrollreceipt` | Recibos |
| `payroll_core_socialbenefitsledger` | Prestaciones |
| ... | (Todas las tablas de negocio) |

### Modelo Tenant

```python
class Tenant(TenantMixin):
    name = models.CharField(max_length=100)
    rif = models.CharField(max_length=15, unique=True)
    status = models.CharField(choices=STATUS_CHOICES)  # TRIAL, ACTIVE, SUSPENDED
    max_employees = models.PositiveIntegerField(default=50)
    max_users = models.PositiveIntegerField(default=5)
    created_on = models.DateField(auto_now_add=True)
    paid_until = models.DateField(null=True)
    
    auto_create_schema = True
```

---

## 13. Flujos de Operación

### Flujo: Cálculo de Nómina

```
1. Usuario abre simulador de nómina
2. Frontend: GET /employees/{id}/simulate-payslip/
3. Backend: Obtener contrato activo
4. Backend: PayrollEngine(contract)
5. Engine: _build_eval_context()
   - Cargar variables de salario (SalarySplitter)
   - Cargar novedades (DB o input_variables)
   - Obtener tasa BCV
6. Engine: Para cada concepto activo (ordenado por receipt_order)
   - Determinar handler según behavior
   - Calcular monto VES
   - Actualizar acumuladores
   - Agregar a líneas del recibo
7. Engine: Calcular totales
8. Backend: Retornar JSON
9. Frontend: Mostrar recibo simulado
```

### Flujo: Cierre de Periodo

```
1. Usuario: Click "Cerrar Periodo"
2. Frontend: POST /payroll-periods/{id}/close-period/
3. Backend: PayrollProcessor.process_period(id)
4. Para cada empleado activo:
   - PayrollEngine(contract)
   - calculate_payroll()
   - Crear PayrollReceipt
   - Crear PayrollReceiptLines
5. Actualizar Period.status = CLOSED
6. Retornar resumen
7. Frontend: Mostrar confirmación
```

### Flujo: Liquidación de Prestaciones

```
1. Usuario: Solicita simulación de liquidación
2. Backend: calculate_final_settlement(contract, termination_date)
3. Método A (Garantía):
   - Sumar todas las transacciones GARANTIA
   - Sumar DIAS_ADIC
   - Sumar INTERES
   - Restar ANTICIPO
4. Método B (Retroactivo):
   - Años de servicio = (termination_date - hire_date) / 365
   - Monto = 30 días × Años × Salario Integral Final
5. Elegir el MAYOR de ambos métodos
6. Retornar comparación y resultado
```

---

## 14. Seguridad

### Configuración CORS

```python
CORS_ALLOWED_ORIGINS = [
    "https://nominix.com.ve",
    "https://*.nominix.com.ve",
]
```

### Headers de Seguridad

```python
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 año
```

### Precisión Decimal

> **REGLA CRÍTICA**: NUNCA usar `float` para valores monetarios.

```python
# ✅ Correcto
from decimal import Decimal
salary = Decimal('500.00')
ivss = salary * Decimal('0.04')

# ❌ Incorrecto
salary = 500.00
ivss = salary * 0.04  # Errores de precisión
```

### Límites de API

| Tipo | Límite |
|------|--------|
| Lectura (GET) | 1000 req/min |
| Escritura (POST/PUT/DELETE) | 100 req/min |
| Exportación (PDF/Excel) | 10 req/min |
| Sincronización BCV | 10 req/hora |

---

## 15. Comandos y Despliegue

### Backend

```powershell
# Activar entorno virtual
.\.venv\Scripts\Activate

# Migraciones
python manage.py makemigrations
python manage.py migrate_schemas --shared  # Tablas compartidas
python manage.py migrate_schemas           # Todos los schemas

# Servidor de desarrollo
python manage.py runserver

# Crear tenant
python manage.py create_tenant
```

### Frontend

```powershell
cd nominix-web

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build producción
npm run build
```

### Docker

```powershell
# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Ejecutar comando en contenedor
docker-compose exec backend python manage.py migrate_schemas
```

### Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=nominix
      - POSTGRES_USER=nominix
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"

  backend:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgres://nominix:${DB_PASSWORD}@db:5432/nominix

  frontend:
    build: ./nominix-web
    command: npm run dev -- --host
    volumes:
      - ./nominix-web:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000

volumes:
  postgres_data:
```

---

## Apéndice: Referencias de Archivos

### Backend

| Archivo | Descripción |
|---------|-------------|
| [engine.py](file:///c:/Desarrollo/RRHH/payroll_core/engine.py) | Motor de nómina |
| [views.py](file:///c:/Desarrollo/RRHH/payroll_core/views.py) | ViewSets API |
| [serializers.py](file:///c:/Desarrollo/RRHH/payroll_core/serializers.py) | Serializadores |
| [models/__init__.py](file:///c:/Desarrollo/RRHH/payroll_core/models/__init__.py) | Modelos |
| [services/salary.py](file:///c:/Desarrollo/RRHH/payroll_core/services/salary.py) | SalarySplitter |
| [services/social_benefits_engine.py](file:///c:/Desarrollo/RRHH/payroll_core/services/social_benefits_engine.py) | Motor prestaciones |
| [customers/models.py](file:///c:/Desarrollo/RRHH/customers/models.py) | Tenant, Domain |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| [src/App.jsx](file:///c:/Desarrollo/RRHH/nominix-web/src/App.jsx) | Router principal |
| [src/api/client.js](file:///c:/Desarrollo/RRHH/nominix-web/src/api/client.js) | Cliente Axios |
| [src/hooks/](file:///c:/Desarrollo/RRHH/nominix-web/src/hooks) | React Query hooks |
| [src/features/](file:///c:/Desarrollo/RRHH/nominix-web/src/features) | Módulos por dominio |

### Documentación Existente

| Archivo | Descripción |
|---------|-------------|
| [ARCHITECTURE.md](file:///c:/Desarrollo/RRHH/docs/ARCHITECTURE.md) | Arquitectura técnica |
| [DATABASE_SCHEMA.md](file:///c:/Desarrollo/RRHH/docs/DATABASE_SCHEMA.md) | Esquema de BD |
| [PAYROLL_ENGINE.md](file:///c:/Desarrollo/RRHH/docs/PAYROLL_ENGINE.md) | Motor de nómina |
| [SOCIAL_BENEFITS.md](file:///c:/Desarrollo/RRHH/docs/SOCIAL_BENEFITS.md) | Prestaciones |
| [SALARY_ENGINEERING.md](file:///c:/Desarrollo/RRHH/docs/SALARY_ENGINEERING.md) | Ingeniería salarial |
| [API_DEVELOPER_GUIDE.md](file:///c:/Desarrollo/RRHH/docs/API_DEVELOPER_GUIDE.md) | Guía API |
| [hooks.md](file:///c:/Desarrollo/RRHH/docs/hooks.md) | React Query hooks |

---

*© 2026 NÓMINIX Suite — Documentación Completa del Sistema V2.0.0*
