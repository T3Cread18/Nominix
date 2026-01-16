# 🔄 Hooks de Datos (React Query) — Nominix

La comunicación con la API se gestiona mediante una capa de hooks personalizados que utilizan `TanStack Query` para el manejo de caché y estados asíncronos.

---

## 🏢 Organización (`useOrganization.js`)
Gestiona la estructura jerárquica de la empresa.
- **useBranches()**: Obtiene la lista de sedes.
- **useDepartments(branchId)**: Departamentos filtrados por sede.
- **useJobPositions(deptId)**: Cargos estructurados filtrados por departamento.
- **useCompanyConfig()**: Datos maestros del tenant (RIF, Nombre, Logo).
- **usePayrollPolicies()**: Factores de cálculo y beneficios legales.

## 👥 Empleados (`useEmployees.js`)
Control de la ficha del trabajador.
- **useEmployees(filters)**: Listado con soporte para búsqueda y filtros de estado.
- **useEmployee(id)**: Detalle profundo de un trabajador.
- **useCreateEmployee() / useUpdateEmployee()**: Mutaciones para gestión de expedientes.
- **usePatchEmployee()**: Actualizaciones parciales (ej. cambio de estado o foto).

## 🛠️ Laboral (`useLabor.js`)
Lógica de contratación y asignaciones individuales.
- **useContracts(employeeId)**: Histórico de contratos. El motor detecta el activo automáticamente.
- **useCreateContract()**: Registro de nuevas condiciones laborales.
- **useEmployeeConcepts(employeeId)**: Bonos y deducciones específicos del empleado.
- **useExchangeRate()**: Provee la tasa BCV oficial del día (VES/USD).

## 💰 Nómina (`usePayroll.js`)
Procesamiento y auditoría.
- **usePayrollPeriods()**: Gestión de quincenas y meses.
- **usePayrollDetail(periodId)**: Vista previa de los resultados antes del cierre.
- **useClosePeriod()**: Ejecuta el cierre definitivo e inmutable.
- **useSimulatePayslip(id)**: Simulación en tiempo real para visualización del empleado.

---

## 🔑 Cache Keys
Estructura de llaves para invalidación manual:
- `['employees']`, `['contracts', employeeId]`, `['branches']`, `['exchange-rate']`.

---

© 2026 NÓMINIX - Data Layer Documentation.
