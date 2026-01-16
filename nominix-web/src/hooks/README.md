# 🔄 Hooks de React Query — Nominix

> Hooks personalizados para fetching de datos con cache automático.

---

## 📦 Instalación

```jsx
// Importar hooks
import { 
    useEmployees, 
    usePayrollPeriods, 
    useBranches 
} from '@/hooks';
```

---

## 👥 Empleados (`useEmployees.js`)

### Listar empleados
```jsx
const { data, isLoading, error, refetch } = useEmployees({
    search: 'Juan',
    branch: 1,
    is_active: true,
    page: 1,
});

// data.results = array de empleados
// data.count = total de registros
```

### Obtener empleado por ID
```jsx
const { data: employee, isLoading } = useEmployee(123);
```

### Crear empleado
```jsx
const { mutate: create, isPending } = useCreateEmployee();

create({
    first_name: 'Juan',
    last_name: 'Pérez',
    national_id: 'V-12345678',
    email: 'juan@empresa.com',
});
```

### Actualizar empleado
```jsx
const { mutate: update } = useUpdateEmployee();

update({
    id: 123,
    data: { first_name: 'Juan Carlos' }
});
```

### Eliminar empleado
```jsx
const { mutate: remove } = useDeleteEmployee();
remove(123);
```

### Simular nómina
```jsx
const { data: simulation } = useSimulatePayslip(employeeId);
// simulation.total_income, simulation.total_deductions, etc.
```

---

## 💰 Nómina (`usePayroll.js`)

### Periodos de nómina
```jsx
// Listar periodos
const { data: periods } = usePayrollPeriods({ status: 'OPEN' });

// Obtener periodo específico
const { data: period } = usePayrollPeriod(periodId);

// Crear periodo
const { mutate: createPeriod } = useCreatePeriod();
createPeriod({ start_date: '2025-01-01', end_date: '2025-01-15' });

// Cerrar periodo
const { mutate: closePeriod } = useClosePeriod();
closePeriod({ periodId: 1, exchangeRate: 45.50 });

// Preview de nómina
const { data: preview } = usePreviewPayroll(periodId);
```

### Conceptos de nómina
```jsx
// Listar conceptos
const { data: concepts } = usePayrollConcepts({ kind: 'EARNING' });

// Obtener concepto
const { data: concept } = usePayrollConcept(conceptId);

// CRUD
const { mutate: create } = useCreateConcept();
const { mutate: update } = useUpdateConcept();
const { mutate: remove } = useDeleteConcept();
```

### Recibos de pago
```jsx
const { data: receipts } = usePayrollReceipts({ 
    period: periodId,
    employee: employeeId 
});
```

### Tasa de cambio
```jsx
const { data: rate } = useLatestExchangeRate('USD');
// rate.value, rate.currency, rate.date
```

---

## 🏢 Organización (`useOrganization.js`)

### Sedes
```jsx
const { data: branches } = useBranches();
const { mutate: createBranch } = useCreateBranch();
const { mutate: updateBranch } = useUpdateBranch();
const { mutate: deleteBranch } = useDeleteBranch();
```

### Departamentos
```jsx
// Filtrar por sede
const { data: departments } = useDepartments(branchId);
const { mutate: createDepartment } = useCreateDepartment();
```

### Cargos
```jsx
// Filtrar por departamento
const { data: positions } = useJobPositions(departmentId);
const { mutate: createPosition } = useCreateJobPosition();
```

### Configuración de empresa
```jsx
const { data: config } = useCompanyConfig();
const { mutate: updateConfig } = useUpdateCompanyConfig();

// Políticas de nómina
const { data: policies } = usePayrollPolicies();
const { mutate: updatePolicies } = useUpdatePayrollPolicies();
```

---

## ⚙️ Configuración Avanzada

### Opciones de Query
```jsx
const { data } = useEmployees(filters, {
    enabled: !!userId,           // Solo ejecutar si userId existe
    staleTime: 10 * 60 * 1000,   // Mantener en cache 10 minutos
    refetchOnMount: false,       // No refetch al montar
    onSuccess: (data) => {},     // Callback al éxito
    onError: (error) => {},      // Callback en error
});
```

### Invalidar Cache Manualmente
```jsx
import { useQueryClient } from '@tanstack/react-query';
import { employeeKeys } from '@/hooks';

const queryClient = useQueryClient();

// Invalidar todas las listas de empleados
queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });

// Invalidar un empleado específico
queryClient.invalidateQueries({ queryKey: employeeKeys.detail(123) });
```

### Actualizar Cache Optimísticamente
```jsx
const updateEmployee = useUpdateEmployee({
    onMutate: async (newData) => {
        // Cancelar queries en progreso
        await queryClient.cancelQueries({ queryKey: employeeKeys.detail(newData.id) });
        
        // Guardar estado previo
        const previous = queryClient.getQueryData(employeeKeys.detail(newData.id));
        
        // Actualizar optimísticamente
        queryClient.setQueryData(employeeKeys.detail(newData.id), old => ({
            ...old,
            ...newData.data
        }));
        
        return { previous };
    },
    onError: (err, vars, context) => {
        // Rollback en error
        queryClient.setQueryData(employeeKeys.detail(vars.id), context.previous);
    },
});
```

---

## 📁 Estructura de Archivos

```
src/hooks/
├── useEmployees.js      # CRUD empleados + simulación
├── usePayroll.js        # Periodos, conceptos, recibos
├── useOrganization.js   # Sedes, departamentos, cargos
└── index.js             # Barrel export
```

---

## 🔑 Query Keys

Cada hook tiene keys centralizadas para evitar errores:

```jsx
// employeeKeys
employeeKeys.all           // ['employees']
employeeKeys.lists()       // ['employees', 'list']
employeeKeys.list(filters) // ['employees', 'list', { search: 'X' }]
employeeKeys.detail(id)    // ['employees', 'detail', 123]

// payrollKeys
payrollKeys.periods        // ['payroll-periods']
payrollKeys.concepts       // ['payroll-concepts']
payrollKeys.receipts       // ['payroll-receipts']

// orgKeys
orgKeys.branches           // ['branches']
orgKeys.departments        // ['departments']
orgKeys.positions          // ['job-positions']
```
