/**
 * useEmployees - Hook de React Query para gestión de empleados.
 * 
 * Proporciona:
 * - Fetching con cache automático
 * - Invalidación después de mutaciones
 * - Loading y error states
 * - Paginación y filtros
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import { toast } from 'sonner';

// ============ QUERY KEYS ============
// Centralizar keys para evitar errores de typo

export const employeeKeys = {
    all: ['employees'],
    lists: () => [...employeeKeys.all, 'list'],
    list: (filters) => [...employeeKeys.lists(), filters],
    details: () => [...employeeKeys.all, 'detail'],
    detail: (id) => [...employeeKeys.details(), id],
};

// ============ FETCH FUNCTIONS ============

const fetchEmployees = async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.branch) params.append('branch', filters.branch);
    if (filters.department) params.append('department', filters.department);
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
    if (filters.page) params.append('page', filters.page);
    if (filters.page_size) params.append('page_size', filters.page_size);

    const response = await axiosClient.get(`/employees/?${params.toString()}`);
    return response.data;
};

const fetchEmployee = async (id) => {
    const response = await axiosClient.get(`/employees/${id}/`);
    return response.data;
};

const createEmployee = async (data) => {
    const response = await axiosClient.post('/employees/', data);
    return response.data;
};

const updateEmployee = async ({ id, data }) => {
    const response = await axiosClient.put(`/employees/${id}/`, data);
    return response.data;
};

const patchEmployee = async ({ id, data }) => {
    const response = await axiosClient.patch(`/employees/${id}/`, data);
    return response.data;
};

const deleteEmployee = async (id) => {
    await axiosClient.delete(`/employees/${id}/`);
    return id;
};

// ============ HOOKS ============

/**
 * Hook para listar empleados con filtros.
 * 
 * @example
 * const { data, isLoading, error } = useEmployees({ search: 'Juan' });
 */
export const useEmployees = (filters = {}, options = {}) => {
    return useQuery({
        queryKey: employeeKeys.list(filters),
        queryFn: () => fetchEmployees(filters),
        staleTime: 5 * 60 * 1000, // 5 minutos
        ...options,
    });
};

/**
 * Hook para obtener un empleado por ID.
 * 
 * @example
 * const { data: employee, isLoading } = useEmployee(123);
 */
export const useEmployee = (id, options = {}) => {
    return useQuery({
        queryKey: employeeKeys.detail(id),
        queryFn: () => fetchEmployee(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

/**
 * Hook para crear empleado.
 * 
 * @example
 * const { mutate: createEmployee, isPending } = useCreateEmployee();
 * createEmployee({ first_name: 'Juan', ... });
 */
export const useCreateEmployee = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createEmployee,
        onSuccess: (data) => {
            // Invalidar lista para refrescar
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            toast.success('Empleado creado exitosamente');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

/**
 * Hook para actualizar empleado (PUT completo).
 */
export const useUpdateEmployee = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateEmployee,
        onSuccess: (data) => {
            // Actualizar cache del empleado específico
            queryClient.setQueryData(employeeKeys.detail(data.id), data);
            // Invalidar lista
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            toast.success('Empleado actualizado');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

/**
 * Hook para actualizar empleado parcialmente (PATCH).
 */
export const usePatchEmployee = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: patchEmployee,
        onSuccess: (data) => {
            queryClient.setQueryData(employeeKeys.detail(data.id), data);
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

/**
 * Hook para eliminar empleado.
 */
export const useDeleteEmployee = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteEmployee,
        onSuccess: (id) => {
            // Remover del cache
            queryClient.removeQueries({ queryKey: employeeKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            toast.success('Empleado eliminado');
            options.onSuccess?.(id);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

/**
 * Hook para simular nómina de empleado.
 */
export const useSimulatePayslip = (employeeId, options = {}) => {
    return useQuery({
        queryKey: ['payslip-simulation', employeeId],
        queryFn: async () => {
            const response = await axiosClient.get(`/employees/${employeeId}/simulate-payslip/`);
            return response.data;
        },
        enabled: !!employeeId,
        staleTime: 30 * 1000, // 30 segundos (cambia frecuentemente)
        ...options,
    });
};
