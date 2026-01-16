/**
 * useOrganization - Hooks de React Query para estructura organizativa.
 * 
 * Incluye:
 * - Sedes (Branches)
 * - Departamentos
 * - Cargos (Job Positions)
 * - Configuración de empresa
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import { toast } from 'sonner';

// ============ QUERY KEYS ============

export const orgKeys = {
    // Branches
    branches: ['branches'],
    branchList: () => [...orgKeys.branches, 'list'],
    branchDetail: (id) => [...orgKeys.branches, 'detail', id],

    // Departments
    departments: ['departments'],
    departmentList: (branchId) => [...orgKeys.departments, 'list', branchId],
    departmentDetail: (id) => [...orgKeys.departments, 'detail', id],

    // Job Positions
    positions: ['job-positions'],
    positionList: (deptId) => [...orgKeys.positions, 'list', deptId],
    positionDetail: (id) => [...orgKeys.positions, 'detail', id],

    // Company
    company: ['company-config'],
    policies: ['company-policies'],
};

// ============ BRANCHES ============

export const useBranches = (options = {}) => {
    return useQuery({
        queryKey: orgKeys.branchList(),
        queryFn: async () => {
            const response = await axiosClient.get('/branches/');
            return response.data.results || response.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutos
        ...options,
    });
};

export const useCreateBranch = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await axiosClient.post('/branches/', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: orgKeys.branches });
            toast.success('Sede creada');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

export const useUpdateBranch = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await axiosClient.put(`/branches/${id}/`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: orgKeys.branches });
            toast.success('Sede actualizada');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

export const useDeleteBranch = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await axiosClient.delete(`/branches/${id}/`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orgKeys.branches });
            toast.success('Sede eliminada');
            options.onSuccess?.();
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

// ============ DEPARTMENTS ============

export const useDepartments = (branchId, options = {}) => {
    return useQuery({
        queryKey: orgKeys.departmentList(branchId),
        queryFn: async () => {
            const url = branchId
                ? `/departments/?branch=${branchId}`
                : '/departments/';
            const response = await axiosClient.get(url);
            return response.data.results || response.data;
        },
        staleTime: 10 * 60 * 1000,
        ...options,
    });
};

export const useCreateDepartment = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await axiosClient.post('/departments/', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: orgKeys.departments });
            toast.success('Departamento creado');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

// ============ JOB POSITIONS ============

export const useJobPositions = (departmentId, options = {}) => {
    return useQuery({
        queryKey: orgKeys.positionList(departmentId),
        queryFn: async () => {
            const url = departmentId
                ? `/job-positions/?department=${departmentId}`
                : '/job-positions/';
            const response = await axiosClient.get(url);
            return response.data.results || response.data;
        },
        staleTime: 10 * 60 * 1000,
        ...options,
    });
};

export const useCreateJobPosition = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await axiosClient.post('/job-positions/', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: orgKeys.positions });
            toast.success('Cargo creado');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

// ============ COMPANY CONFIG ============

export const useCompanyConfig = (options = {}) => {
    return useQuery({
        queryKey: orgKeys.company,
        queryFn: async () => {
            const response = await axiosClient.get('/company/config/');
            return response.data;
        },
        staleTime: 10 * 60 * 1000,
        ...options,
    });
};

export const useUpdateCompanyConfig = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await axiosClient.put('/company/config/', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(orgKeys.company, data);
            toast.success('Configuración actualizada');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

// ============ PAYROLL POLICIES ============

export const usePayrollPolicies = (options = {}) => {
    return useQuery({
        queryKey: orgKeys.policies,
        queryFn: async () => {
            const response = await axiosClient.get('/company/policies/');
            return response.data;
        },
        staleTime: 10 * 60 * 1000,
        ...options,
    });
};

export const useUpdatePayrollPolicies = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await axiosClient.put('/company/policies/', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(orgKeys.policies, data);
            toast.success('Políticas actualizadas');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};
