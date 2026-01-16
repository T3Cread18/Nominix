/**
 * Hooks - Nominix
 * 
 * Barrel file que exporta todos los React Query hooks.
 */

// ============ EMPLOYEES ============
export {
    useEmployees,
    useEmployee,
    useCreateEmployee,
    useUpdateEmployee,
    usePatchEmployee,
    useDeleteEmployee,
    useSimulatePayslip,
    employeeKeys,
} from './useEmployees';

// ============ PAYROLL ============
export {
    // Periods
    usePayrollPeriods,
    usePayrollPeriod,
    useCreatePeriod,
    useClosePeriod,
    usePreviewPayroll,
    // Concepts
    usePayrollConcepts,
    usePayrollConcept,
    useCreateConcept,
    useUpdateConcept,
    useDeleteConcept,
    // Receipts
    usePayrollReceipts,
    // Exchange Rate
    useLatestExchangeRate,
    // Keys
    payrollKeys,
} from './usePayroll';

// ============ ORGANIZATION ============
export {
    // Branches
    useBranches,
    useCreateBranch,
    useUpdateBranch,
    useDeleteBranch,
    // Departments
    useDepartments,
    useCreateDepartment,
    // Job Positions
    useJobPositions,
    useCreateJobPosition,
    // Company Config
    useCompanyConfig,
    useUpdateCompanyConfig,
    // Payroll Policies
    usePayrollPolicies,
    useUpdatePayrollPolicies,
    // Keys
    orgKeys,
} from './useOrganization';
