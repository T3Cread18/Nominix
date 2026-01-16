# Nóminix Suite - Documentación Técnica del Proyecto (V1.3.1)

Nóminix es una plataforma SaaS (Software as a Service) modular diseñada para la gestión integral de Recursos Humanos y Nómina, optimizada para el marco legal de Venezuela.

---

## 🏗️ Arquitectura del Sistema

### Capa de Backend (Django 5.0 + PostgreSQL)
- **Aislamiento Multi-tenant**: Cada empresa (`Tenant`) posee su propio esquema de base de datos. Los datos compartidos (dominios, planes) residen en el esquema `public`.
- **Motor de Reglas (engine.py)**: Sistema de evaluación de fórmulas basado en `simpleeval`. Implementa un flujo atómico de cálculo: **Contexto → Asignaciones → Acumuladores → Deducciones**.
- **Modelos de Negocio**:
    - `Employee`: Ficha maestra con validación de RIF/Cédula y cálculo automático de antigüedad.
    - `LaborContract`: Contratos vinculados a cargos (`JobPosition`) con soporte para salarios en divisas (`salary_currency`).
    - `PayrollConcept`: Catálogo dinámico con comportamientos especializados (`SALARY_BASE`, `CESTATICKET`, `LAW_DEDUCTION`).

### Capa de Frontend (React 18 + Vite)
- **Arquitectura de Features**: Código organizado por lógica de negocio (`hr`, `payroll`, `settings`).
- **Design System Propio**: Componentes atómicos que garantizan consistencia visual y accesibilidad.
- **TanStack Query (React Query)**: Gestión de estado asíncrono con políticas de invalidación inteligentes (`staleTime`, `cacheTime`).

---

## ⚙️ El Motor de Nómina (PayrollEngine)

### 1. Inventario de Variables Globales
El motor inyecta automáticamente variables al contexto de las fórmulas:
- `SALARIO_MENSUAL`: Salario total pactado en contrato.
- `SUELDO_BASE_DIARIO`: Salario base (sin complementos) entre 30.
- `LUNES`: Cantidad de lunes en el periodo (base para IVSS/PIE).
- `DIAS_HABILES`: Conteo real de días laborables según calendario.
- `ANTIGUEDAD`: Años de servicio cumplidos hasta la fecha de pago.

### 2. Flujo de Procesamiento
1.  **Carga de Novedades**: Obtiene incidencias manuales (`PayrollNovelty`) y las mapea a nombres de variables estandarizados.
2.  **Partición de Salario**: El `SalarySplitter` divide el salario en base legal y complemento de mercado.
3.  **Ejecución de Conceptos**:
    - **Earnings**: Calcula bonos y salarios. Actualiza acumuladores para incidencias (ej. `TOTAL_FAOV_BASE`).
    - **Deductions**: Aplica retenciones basadas en leyes o acumuladores previos.
4.  **Snapshots**: Al cerrar el periodo, se guarda la tasa BCV y una copia inmutable del contrato.

---

## 👥 Módulos de Frontend Detallados

### 1. Directorio de Personal (`hr`)
- **PersonnelManager**: Dashboard de empleados con búsqueda y filtros por sede/estado.
- **EmployeeFormPage**: Gestión integral utilizando `Tabs` para separar el perfil personal de la gestión de contratos y bonos recurrentes.

### 2. Control de Nómina (`payroll`)
- **PayrollDashboard**: Resumen de periodos abiertos y cerrados.
- **PayrollClosure**: Proceso guiado para la ejecución de cierres definitivos con ingreso de tasa manual si falla la automatización BCV.
- **NovedadesGrid**: Interfaz de carga masiva de incidencias (horas extra, bonos únicos).

### 3. Centro de Configuración (`settings`)
- **OrganizationManager**: Control jerárquico de Sedes → Departamentos → Cargos.
- **PolicyForm**: Configuración de factores de recargo (Ferianos, Horas Extra, Nocturnidad).

---

## 📈 Trazabilidad y Auditoría
Cada cálculo genera un `trace` que es la fórmula expandida con valores reales. Ejemplo:
`Fórmula: (SALARIO_MENSUAL / 30) * DIAS`
`Trace: (5000.00 / 30) * 15`

---

© 2026 NÓMINIX - Documento de Referencia Técnica Profunda.
