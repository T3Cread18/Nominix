import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';

// --- CONTRATOS LABORALES ---

export const useContracts = (employeeId) => {
    return useQuery({
        queryKey: ['contracts', employeeId],
        queryFn: async () => {
            if (!employeeId) return [];
            const { data } = await axiosClient.get(`/contracts/?employee=${employeeId}`);
            return data.results || data;
        },
        enabled: !!employeeId,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
};

export const useCreateContract = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (contractData) => axiosClient.post('/contracts/', contractData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['contracts', variables.employee]);
            queryClient.invalidateQueries(['employees']); // Refrescar estado del empleado
        },
    });
};

export const useUpdateContract = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => axiosClient.put(`/contracts/${id}/`, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['contracts']);
            queryClient.invalidateQueries(['employees']);
        },
    });
};

export const useDeleteContract = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => axiosClient.delete(`/contracts/${id}/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['contracts']);
        },
    });
};

// --- CONCEPTOS DE EMPLEADO (ASIGNACIONES) ---

export const useEmployeeConcepts = (employeeId) => {
    return useQuery({
        queryKey: ['employee-concepts', employeeId],
        queryFn: async () => {
            if (!employeeId) return [];
            const { data } = await axiosClient.get(`/employee-concepts/?employee=${employeeId}`);
            return data.results || data;
        },
        enabled: !!employeeId,
    });
};

export const useAssignConcept = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (assignmentData) => axiosClient.post('/employee-concepts/', assignmentData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['employee-concepts', variables.employee]);
        },
    });
};

export const useDeleteAssignedConcept = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, employeeId }) => axiosClient.delete(`/employee-concepts/${id}/`),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['employee-concepts', variables.employeeId]);
        },
    });
};

export const useAvailableConcepts = () => {
    return useQuery({
        queryKey: ['payroll-concepts', 'active'],
        queryFn: async () => {
            const { data } = await axiosClient.get('/payroll-concepts/?active=true');
            return data.results || data;
        },
        staleTime: 1000 * 60 * 30, // 30 mins
    });
};

// --- TASA DE CAMBIO ---

export const useExchangeRate = () => {
    return useQuery({
        queryKey: ['exchange-rate'],
        queryFn: async () => {
            try {
                // Endpoint real para tasa de cambio
                const { data } = await axiosClient.get('/exchange-rates/latest/?currency=USD');
                return data.rate || data.value || 60.00;
            } catch (e) {
                console.error("Error fetching exchange rate:", e);
                return 60.00; // Fallback
            }
        },
        staleTime: 1000 * 60 * 60, // 1 hora
    });
};
