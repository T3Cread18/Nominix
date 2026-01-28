# 🪝 React Query Hooks — Nóminix Suite

> Referencia completa de hooks personalizados para gestión de estado del servidor.
> **Versión:** 2.0.0 | **Última Actualización:** Enero 2026

---

## 📋 Índice

1. [Instalación y Configuración](#instalación-y-configuración)
2. [Empleados (useEmployees)](#empleados-useemployees)
3. [Contratos (useLabor)](#contratos-uselabor)
4. [Nómina (usePayroll)](#nómina-usepayroll)
5. [Organización (useOrganization)](#organización-useorganization)
6. [Prestaciones Sociales (useSocialBenefits)](#prestaciones-sociales-usesocialbenefits)
7. [Query Keys](#query-keys)
8. [Configuración Avanzada](#configuración-avanzada)

---

## Instalación y Configuración

### Importación

```jsx
import { 
    // Empleados
    useEmployees, 
    useEmployee,
    useCreateEmployee,
    useUpdateEmployee,
    useDeleteEmployee,
    useSimulatePayslip,
    
    // Nómina
    usePayrollPeriods,
    usePayrollPeriod,
    usePreviewPayroll,
    useClosePeriod,
    usePayrollConcepts,
    
    // Organización
    useBranches,
    useDepartments,
    useJobPositions,
    useCompanyConfig,
    
    // Prestaciones
    useSocialBenefitsLedger,
    useSettlementSimulation,
    
    // Keys para invalidación
    employeeKeys,
    payrollKeys,
    orgKeys,
    socialBenefitsKeys,
} from '@/hooks';
```

### Estructura de Archivos

```
src/hooks/
├── index.js               # Barrel export
├── useEmployees.js        # CRUD empleados + simulación
├── useLabor.js            # Contratos laborales + préstamos
├── usePayroll.js          # Periodos, conceptos, recibos
├── useOrganization.js     # Sedes, departamentos, cargos
├── useSocialBenefits.js   # Prestaciones sociales
└── README.md              # Esta documentación
```

---

## Empleados (useEmployees)

### Listar Empleados

```jsx
const { data, isLoading, error, refetch } = useEmployees({
    search: 'Juan',      // Búsqueda por nombre/cédula
    branch: 1,           // Filtrar por sede
    is_active: true,     // Solo activos
    page: 1,             // Paginación
});

// Estructura de respuesta
// data.results = Employee[]
// data.count = número total
// data.next = URL siguiente página
// data.previous = URL página anterior
```

### Obtener Empleado por ID

```jsx
const { data: employee, isLoading } = useEmployee(123);

// employee = {
//   id: 123,
//   first_name: 'Juan',
//   last_name: 'Pérez',
//   national_id: 'V-12345678',
//   hire_date: '2020-01-15',
//   seniority_years: 6,
//   active_contract: {...},
//   ...
// }
```

### Crear Empleado

```jsx
const { mutate: create, isPending, error } = useCreateEmployee();

const handleCreate = () => {
    create({
        first_name: 'Juan',
        last_name: 'Pérez',
        national_id: 'V-12345678',
        email: 'juan@empresa.com',
        hire_date: '2026-01-15',
        branch: 1,
        department: 3,
        position: 5,
    }, {
        onSuccess: (data) => {
            console.log('Empleado creado:', data.id);
        },
        onError: (error) => {
            console.error('Error:', error.response.data);
        }
    });
};
```

### Actualizar Empleado

```jsx
const { mutate: update, isPending } = useUpdateEmployee();

update({
    id: 123,
    data: { 
        first_name: 'Juan Carlos',
        phone: '0412-1234567'
    }
});
```

### Eliminar Empleado

```jsx
const { mutate: remove, isPending } = useDeleteEmployee();

remove(123, {
    onError: (error) => {
        // Puede fallar si tiene histórico de nóminas
        alert(error.response.data.error);
    }
});
```

### Simular Nómina

```jsx
const { data: simulation, isLoading } = useSimulatePayslip(employeeId, {
    // Variables de novedad opcionales
    FALTAS: 2,
    H_EXTRA: 4,
}, {
    enabled: !!employeeId,
});

// simulation = {
//   lines: [
//     { code: 'SUELDO_BASE', name: 'Sueldo Base', amount_ves: 4181.25, kind: 'EARNING' },
//     { code: 'IVSS', name: 'Seguro Social', amount_ves: 167.25, kind: 'DEDUCTION' },
//     ...
//   ],
//   totals: {
//     total_earnings: 8500.00,
//     total_deductions: 450.00,
//     net_pay: 8050.00
//   }
// }
```

---

## Contratos (useLabor)

### Listar Contratos por Empleado

```jsx
const { data: contracts, isLoading } = useContracts(employeeId);

// contracts = [
//   { id: 1, start_date: '2020-01-15', contract_type: 'INDEFINIDO', is_active: true, ... },
//   { id: 2, start_date: '2019-01-01', end_date: '2019-12-31', is_active: false, ... },
// ]
```

### Obtener Contrato Activo

```jsx
const { data: activeContract } = useActiveContract(employeeId);

// null si no hay contrato activo
// activeContract = { id: 1, salary_amount: 500.00, position: {...}, ... }
```

### Crear Contrato

```jsx
const { mutate: createContract } = useCreateContract();

createContract({
    employee: 123,
    position: 5,
    branch: 1,
    contract_type: 'INDEFINIDO',
    payment_frequency: 'QUINCENAL',
    start_date: '2026-01-15',
    salary_amount: 500.00,
    salary_currency: 'USD',
    total_salary_override: 500.00,  // Opcional
});
```

### Actualizar Contrato

```jsx
const { mutate: updateContract } = useUpdateContract();

updateContract({
    id: 15,
    data: {
        salary_amount: 550.00,
    }
});
```

### Préstamos del Empleado

```jsx
const { data: loans } = useLoans(employeeId);

// loans = [
//   { id: 1, amount: 200.00, monthly_deduction: 50.00, status: 'ACTIVO', remaining_balance: 100.00 },
// ]

const { mutate: createLoan } = useCreateLoan();

createLoan({
    employee: 123,
    amount: 200.00,
    currency: 'USD',
    monthly_deduction: 50.00,
    total_installments: 4,
});

const { data: payments } = useLoanPayments(loanId);
```

---

## Nómina (usePayroll)

### Periodos de Nómina

```jsx
// Listar periodos
const { data: periods } = usePayrollPeriods({ 
    status: 'OPEN',      // DRAFT, OPEN, PROCESSING, CLOSED
    ordering: '-payment_date'
});

// Obtener periodo específico
const { data: period } = usePayrollPeriod(periodId);

// period = {
//   id: 5,
//   name: 'Enero 2026 - 1ra Quincena',
//   start_date: '2026-01-01',
//   end_date: '2026-01-15',
//   payment_date: '2026-01-15',
//   status: 'OPEN',
//   receipts_count: 25,
// }
```

### Crear Periodo

```jsx
const { mutate: createPeriod } = useCreatePeriod();

createPeriod({
    name: 'Enero 2026 - 1ra Quincena',
    period_type: 'Q1',
    start_date: '2026-01-01',
    end_date: '2026-01-15',
    payment_date: '2026-01-15',
});
```

### Preview de Nómina

```jsx
const { data: preview, isLoading, refetch } = usePreviewPayroll(periodId, {
    manual_rate: 55.75,  // Tasa manual opcional
});

// preview = {
//   employees: [
//     { employee_id: 1, full_name: 'Juan Pérez', net_pay: 8050.00 },
//     ...
//   ],
//   summary: {
//     total_employees: 25,
//     total_earnings: 250000.00,
//     total_deductions: 15000.00,
//     total_net: 235000.00,
//   },
//   exchange_rate: 55.75,
// }
```

### Cerrar Periodo

```jsx
const { mutate: closePeriod, isPending } = useClosePeriod();

closePeriod({
    periodId: 5,
    exchangeRate: 55.75,  // Tasa manual si BCV no disponible
}, {
    onSuccess: (data) => {
        toast.success(`Periodo cerrado: ${data.receipts_count} recibos generados`);
    },
    onError: (error) => {
        toast.error(error.response.data.error);
    }
});
```

### Conceptos de Nómina

```jsx
// Listar conceptos
const { data: concepts } = usePayrollConcepts({ 
    kind: 'EARNING',     // EARNING, DEDUCTION
    active: true,
});

// Obtener concepto
const { data: concept } = usePayrollConcept(conceptId);

// CRUD
const { mutate: createConcept } = useCreateConcept();
const { mutate: updateConcept } = useUpdateConcept();
const { mutate: deleteConcept } = useDeleteConcept();

createConcept({
    code: 'BONO_PROD',
    name: 'Bono de Productividad',
    kind: 'EARNING',
    behavior: 'DYNAMIC',
    computation_method: 'FORMULA',
    formula: 'SUELDO_BASE_DIARIO * FACTOR_BONO * TASA',
    active: true,
});
```

### Metadata de Conceptos

```jsx
const { data: metadata } = useConceptConfigMetadata();

// metadata = {
//   behaviors: [{ value: 'SALARY_BASE', label: 'Sueldo Base' }, ...],
//   kinds: [{ value: 'EARNING', label: 'Asignación' }, ...],
//   computation_methods: [...],
//   accumulators: [{ code: 'IVSS_BASE', label: 'Base IVSS' }, ...],
//   behavior_required_params: { LAW_DEDUCTION: ['rate', 'base_source'], ... },
// }
```

### Novedades de Nómina

```jsx
const { data: novelties } = usePayrollNovelties({
    period: periodId,
    employee: employeeId,
});

const { mutate: createNovelty } = useCreateNovelty();

createNovelty({
    employee: 123,
    period: 5,
    concept_code: 'H_EXTRA',
    amount: 8,  // 8 horas extra
});

// Carga masiva
const { mutate: batchNovelties } = useBatchNovelties();

batchNovelties([
    { employee_id: 123, period_id: 5, concept_code: 'H_EXTRA', amount: 8 },
    { employee_id: 124, period_id: 5, concept_code: 'FALTAS', amount: 1 },
]);
```

### Recibos de Pago

```jsx
const { data: receipts } = usePayrollReceipts({ 
    period: periodId,
    employee: employeeId,
});

// receipt = {
//   id: 100,
//   period: { id: 5, name: '...' },
//   employee: { id: 123, full_name: 'Juan Pérez' },
//   total_earnings_ves: 8500.00,
//   total_deductions_ves: 450.00,
//   net_pay_ves: 8050.00,
//   exchange_rate_applied: 55.75,
//   lines: [...],
// }
```

### Tasa de Cambio

```jsx
const { data: rate,  isLoading, refetch } = useLatestExchangeRate('USD');

// rate = {
//   currency: 'USD',
//   rate: 55.75,
//   date: '2026-01-15T10:30:00Z',
//   source: 'BCV'
// }

// Forzar sincronización con BCV
const { mutate: syncBCV } = useSyncBCVRates();

syncBCV(null, {
    onSuccess: (data) => {
        console.log('Tasas actualizadas:', data);
    }
});
```

---

## Organización (useOrganization)

### Sedes (Branches)

```jsx
const { data: branches } = useBranches();
const { mutate: createBranch } = useCreateBranch();
const { mutate: updateBranch } = useUpdateBranch();
const { mutate: deleteBranch } = useDeleteBranch();

createBranch({
    name: 'Sede Central',
    code: 'SC-001',
    address: 'Av. Principal, Caracas',
});
```

### Departamentos

```jsx
// Filtrar por sede
const { data: departments } = useDepartments(branchId);

const { mutate: createDepartment } = useCreateDepartment();

createDepartment({
    branch: 1,
    name: 'Recursos Humanos',
    code: 'RRHH',
});
```

### Cargos (Job Positions)

```jsx
// Filtrar por departamento
const { data: positions } = useJobPositions(departmentId);

const { mutate: createPosition } = useCreateJobPosition();

createPosition({
    department: 3,
    name: 'Analista de Nómina',
    code: 'AN-NOM-001',
    base_salary_amount: 400.00,
    base_salary_currency: 'USD',
    split_fixed_amount: 130.00,  // Para ingeniería salarial
});
```

### Configuración de Empresa

```jsx
const { data: config } = useCompanyConfig();

// config = {
//   name: 'Mi Empresa C.A.',
//   rif: 'J-12345678-9',
//   salary_split_mode: 'FIXED_BASE',
//   split_percentage_base: 30.00,
//   national_minimum_salary: 130.00,
//   cestaticket_amount_usd: 40.00,
// }

const { mutate: updateConfig } = useUpdateCompanyConfig();

updateConfig({
    salary_split_mode: 'PERCENTAGE',
    split_percentage_base: 35.00,
});
```

### Políticas de Nómina

```jsx
const { data: policies } = usePayrollPolicies();

// policies = {
//   factor_dias_utilidades: 30,
//   factor_dias_bono_vacacional: 15,
//   overtime_multiplier: 1.5,
//   holiday_multiplier: 2.0,
//   ivss_employee_rate: 4.00,
//   faov_employee_rate: 1.00,
// }

const { mutate: updatePolicies } = useUpdatePayrollPolicies();

updatePolicies({
    overtime_multiplier: 1.75,
});
```

---

## Prestaciones Sociales (useSocialBenefits)

### Histórico del Libro Mayor

```jsx
const { data: ledger, isLoading } = useSocialBenefitsLedger(employeeId);

// ledger = [
//   {
//     id: 1,
//     transaction_type: 'GARANTIA',
//     transaction_date: '2025-12-31',
//     period_description: 'Q4-2025',
//     basis_days: 15,
//     daily_salary_used: 79.17,
//     amount: 1187.55,
//     balance: 1187.55,
//   },
//   {
//     id: 2,
//     transaction_type: 'INTERES',
//     transaction_date: '2026-01-15',
//     period_description: 'Año 2025',
//     interest_rate_used: 15.00,
//     amount: 178.13,
//     balance: 1365.68,
//   },
// ]
```

### Saldo Actual

```jsx
const { data: balance } = useCurrentBalance(employeeId);

// balance = {
//   current_balance: 1365.68,
//   last_transaction_date: '2026-01-15',
//   currency: 'USD',
// }
```

### Simular Liquidación

```jsx
const { data: simulation, refetch } = useSettlementSimulation(employeeId, {
    termination_date: '2026-01-31',
});

// simulation = {
//   // Método A: Garantía
//   total_garantia: 4750.00,
//   total_dias_adicionales: 1266.72,
//   total_intereses: 900.00,
//   total_anticipos: 500.00,
//   net_garantia: 6416.72,
//   
//   // Método B: Retroactivo
//   years_of_service: 5.25,
//   retroactive_days: 157.50,
//   final_daily_salary: 85.00,
//   retroactive_amount: 13387.50,
//   
//   // Resultado
//   chosen_method: 'RETROACTIVO',
//   settlement_amount: 13387.50,
// }
```

### Procesar Garantía Trimestral

```jsx
const { mutate: processQuarterly, isPending } = useProcessQuarterlyGuarantee();

processQuarterly({
    employee_id: 123,
    transaction_date: '2025-12-31',
    period_description: 'Q4-2025',
});
```

### Procesar Intereses Anuales

```jsx
const { mutate: processInterest, isPending } = useProcessAnnualInterest();

processInterest({
    employee_id: 123,
    year: 2025,
    transaction_date: '2026-01-15',
});
```

### Registrar Anticipo

```jsx
const { mutate: registerAdvance } = useRegisterAdvance();

registerAdvance({
    employee_id: 123,
    amount: 500.00,
    transaction_date: '2026-01-20',
    notes: 'Anticipo solicitado por el empleado',
});
```

### Crear Liquidación Final

```jsx
const { mutate: createSettlement, isPending } = useCreateSettlement();

createSettlement({
    employee_id: 123,
    termination_date: '2026-01-31',
    notes: 'Renuncia voluntaria',
}, {
    onSuccess: (data) => {
        console.log(`Liquidación: ${data.chosen_method} - ${data.settlement_amount}`);
    }
});
```

### Tasas de Interés BCV

```jsx
const { data: rates } = useInterestRates(2025);

// rates = [
//   { year: 2025, month: 1, rate: 15.25 },
//   { year: 2025, month: 2, rate: 15.50 },
//   ...
// ]

const { mutate: createRate } = useCreateInterestRate();

createRate({
    year: 2026,
    month: 1,
    rate: 15.75,
});
```

---

## Query Keys

Cada hook tiene keys centralizadas para facilitar la invalidación de cache.

### Estructura de Keys

```jsx
// employeeKeys
employeeKeys.all           // ['employees']
employeeKeys.lists()       // ['employees', 'list']
employeeKeys.list(filters) // ['employees', 'list', { search: 'X', branch: 1 }]
employeeKeys.detail(id)    // ['employees', 'detail', 123]
employeeKeys.simulation(id) // ['employees', 'simulation', 123]

// payrollKeys
payrollKeys.all            // ['payroll']
payrollKeys.periods()      // ['payroll', 'periods']
payrollKeys.period(id)     // ['payroll', 'periods', 5]
payrollKeys.preview(id)    // ['payroll', 'preview', 5]
payrollKeys.concepts()     // ['payroll', 'concepts']
payrollKeys.receipts()     // ['payroll', 'receipts']
payrollKeys.novelties()    // ['payroll', 'novelties']
payrollKeys.exchangeRate() // ['exchange-rate']

// orgKeys
orgKeys.all                // ['organization']
orgKeys.branches()         // ['organization', 'branches']
orgKeys.departments(branchId)  // ['organization', 'departments', 1]
orgKeys.positions(deptId)  // ['organization', 'positions', 3]
orgKeys.company()          // ['organization', 'company']
orgKeys.policies()         // ['organization', 'policies']

// socialBenefitsKeys
socialBenefitsKeys.all             // ['social-benefits']
socialBenefitsKeys.ledger(empId)   // ['social-benefits', 'ledger', 123]
socialBenefitsKeys.balance(empId)  // ['social-benefits', 'balance', 123]
socialBenefitsKeys.simulation(empId) // ['social-benefits', 'simulation', 123]
socialBenefitsKeys.settlements()   // ['social-benefits', 'settlements']
socialBenefitsKeys.interestRates(year) // ['interest-rates', 2025]
```

### Invalidación Manual

```jsx
import { useQueryClient } from '@tanstack/react-query';
import { employeeKeys, payrollKeys } from '@/hooks';

function MyComponent() {
    const queryClient = useQueryClient();
    
    const handleRefresh = () => {
        // Invalidar todas las listas de empleados
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
        
        // Invalidar un empleado específico
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(123) });
        
        // Invalidar todo lo relacionado a nómina
        queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    };
}
```

---

## Configuración Avanzada

### Opciones de Query

```jsx
const { data } = useEmployees(filters, {
    enabled: !!userId,           // Solo ejecutar si userId existe
    staleTime: 10 * 60 * 1000,   // Mantener en cache 10 minutos
    gcTime: 30 * 60 * 1000,      // Garbage collection después de 30 min
    refetchOnMount: false,       // No refetch al montar
    refetchOnWindowFocus: false, // No refetch al volver a la ventana
    retry: 3,                    // Reintentar 3 veces en error
    retryDelay: 1000,            // Esperar 1s entre reintentos
});
```

### Callbacks

```jsx
const { data } = useEmployees(filters, {
    onSuccess: (data) => {
        console.log('Empleados cargados:', data.count);
    },
    onError: (error) => {
        toast.error(`Error: ${error.message}`);
    },
    onSettled: (data, error) => {
        // Se ejecuta siempre, con éxito o error
        setLoading(false);
    },
});
```

### Actualizaciones Optimistas

```jsx
const queryClient = useQueryClient();

const updateEmployee = useUpdateEmployee({
    onMutate: async (newData) => {
        // Cancelar queries en progreso
        await queryClient.cancelQueries({ 
            queryKey: employeeKeys.detail(newData.id) 
        });
        
        // Guardar estado previo
        const previous = queryClient.getQueryData(
            employeeKeys.detail(newData.id)
        );
        
        // Actualizar cache optimísticamente
        queryClient.setQueryData(
            employeeKeys.detail(newData.id), 
            old => ({ ...old, ...newData.data })
        );
        
        return { previous };
    },
    onError: (err, newData, context) => {
        // Rollback en error
        queryClient.setQueryData(
            employeeKeys.detail(newData.id), 
            context.previous
        );
    },
    onSettled: (data, error, variables) => {
        // Siempre refetch al final
        queryClient.invalidateQueries({ 
            queryKey: employeeKeys.detail(variables.id) 
        });
    },
});
```

### Prefetching

```jsx
const queryClient = useQueryClient();

// Prefetch en hover
const handleMouseEnter = (employeeId) => {
    queryClient.prefetchQuery({
        queryKey: employeeKeys.detail(employeeId),
        queryFn: () => api.get(`/employees/${employeeId}/`),
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
};
```

### Infinite Queries (Paginación Infinita)

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';

function useInfiniteEmployees(filters) {
    return useInfiniteQuery({
        queryKey: [...employeeKeys.lists(), 'infinite', filters],
        queryFn: ({ pageParam = 1 }) => 
            api.get('/employees/', { params: { ...filters, page: pageParam } }),
        getNextPageParam: (lastPage) => {
            if (lastPage.next) {
                const url = new URL(lastPage.next);
                return url.searchParams.get('page');
            }
            return undefined;
        },
        getPreviousPageParam: (firstPage) => {
            if (firstPage.previous) {
                const url = new URL(firstPage.previous);
                return url.searchParams.get('page');
            }
            return undefined;
        },
    });
}
```

---

## Referencias

- **Hooks de Empleados**: [nominix-web/src/hooks/useEmployees.js](file:///c:/Desarrollo/RRHH/nominix-web/src/hooks/useEmployees.js)
- **Hooks de Nómina**: [nominix-web/src/hooks/usePayroll.js](file:///c:/Desarrollo/RRHH/nominix-web/src/hooks/usePayroll.js)
- **Hooks de Organización**: [nominix-web/src/hooks/useOrganization.js](file:///c:/Desarrollo/RRHH/nominix-web/src/hooks/useOrganization.js)
- **Hooks de Prestaciones**: [nominix-web/src/hooks/useSocialBenefits.js](file:///c:/Desarrollo/RRHH/nominix-web/src/hooks/useSocialBenefits.js)
- **Hooks Laborales**: [nominix-web/src/hooks/useLabor.js](file:///c:/Desarrollo/RRHH/nominix-web/src/hooks/useLabor.js)
- **TanStack Query Docs**: https://tanstack.com/query/latest

---

*© 2026 NÓMINIX Suite — Documentación de React Query Hooks V2.0.0*
