/**
 * usePayroll - Hooks de React Query para gestión de nómina.
 * 
 * Incluye:
 * - Periodos de nómina
 * - Conceptos
 * - Recibos
 * - Novedades
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import { toast } from 'sonner';

// ============ QUERY KEYS ============

export const payrollKeys = {
    // Periodos
    periods: ['payroll-periods'],
    periodList: (filters) => [...payrollKeys.periods, 'list', filters],
    periodDetail: (id) => [...payrollKeys.periods, 'detail', id],

    // Conceptos
    concepts: ['payroll-concepts'],
    conceptList: (filters) => [...payrollKeys.concepts, 'list', filters],
    conceptDetail: (id) => [...payrollKeys.concepts, 'detail', id],

    // Recibos
    receipts: ['payroll-receipts'],
    receiptList: (filters) => [...payrollKeys.receipts, 'list', filters],
    receiptDetail: (id) => [...payrollKeys.receipts, 'detail', id],

    // Preview
    preview: (periodId) => ['payroll-preview', periodId],

    // Exchange rate
    exchangeRate: ['exchange-rate', 'latest'],
};

// ============ PAYROLL PERIODS ============

export const usePayrollPeriods = (filters = {}, options = {}) => {
    return useQuery({
        queryKey: payrollKeys.periodList(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.year) params.append('year', filters.year);

            const response = await axiosClient.get(`/payroll-periods/?${params.toString()}`);
            return response.data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutos
        ...options,
    });
};

export const usePayrollPeriod = (id, options = {}) => {
    return useQuery({
        queryKey: payrollKeys.periodDetail(id),
        queryFn: async () => {
            const response = await axiosClient.get(`/payroll-periods/${id}/`);
            return response.data;
        },
        enabled: !!id,
        ...options,
    });
};

export const useCreatePeriod = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await axiosClient.post('/payroll-periods/', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.periods });
            toast.success('Periodo creado');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

export const useClosePeriod = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ periodId, exchangeRate }) => {
            const response = await axiosClient.post(
                `/payroll-periods/${periodId}/close/`,
                { exchange_rate: exchangeRate }
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.periods });
            queryClient.invalidateQueries({ queryKey: payrollKeys.receipts });
            toast.success('Periodo cerrado exitosamente');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

export const usePreviewPayroll = (periodId, options = {}) => {
    return useQuery({
        queryKey: payrollKeys.preview(periodId),
        queryFn: async () => {
            const response = await axiosClient.get(`/payroll-periods/${periodId}/preview-payroll/`);
            return response.data;
        },
        enabled: !!periodId,
        staleTime: 30 * 1000, // 30 segundos
        ...options,
    });
};

// ============ PAYROLL CONCEPTS ============

export const usePayrollConcepts = (filters = {}, options = {}) => {
    return useQuery({
        queryKey: payrollKeys.conceptList(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.kind) params.append('kind', filters.kind);
            if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
            if (filters.search) params.append('search', filters.search);

            const response = await axiosClient.get(`/concepts/?${params.toString()}`);
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const usePayrollConcept = (id, options = {}) => {
    return useQuery({
        queryKey: payrollKeys.conceptDetail(id),
        queryFn: async () => {
            const response = await axiosClient.get(`/concepts/${id}/`);
            return response.data;
        },
        enabled: !!id,
        ...options,
    });
};

export const useCreateConcept = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await axiosClient.post('/concepts/', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.concepts });
            toast.success('Concepto creado');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

export const useUpdateConcept = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await axiosClient.put(`/concepts/${id}/`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(payrollKeys.conceptDetail(data.id), data);
            queryClient.invalidateQueries({ queryKey: payrollKeys.concepts });
            toast.success('Concepto actualizado');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

export const useDeleteConcept = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await axiosClient.delete(`/concepts/${id}/`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.removeQueries({ queryKey: payrollKeys.conceptDetail(id) });
            queryClient.invalidateQueries({ queryKey: payrollKeys.concepts });
            toast.success('Concepto eliminado');
            options.onSuccess?.(id);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        },
    });
};

// ============ PAYROLL RECEIPTS ============

export const usePayrollReceipts = (filters = {}, options = {}) => {
    return useQuery({
        queryKey: ['payrollReceipts', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.period) params.append('period', filters.period);
            if (filters.employee) params.append('employee', filters.employee);

            const response = await axiosClient.get(`/payslips/?${params.toString()}`);
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useUnifiedPaymentHistory = (filters = {}) => {
    return useQuery({
        queryKey: ['unifiedPaymentHistory', filters],
        queryFn: async () => {
            if (!filters.employee) return [];
            const response = await axiosClient.get(`/employees/${filters.employee}/payment-history/`);
            return response.data;
        },
        enabled: !!filters.employee,
        staleTime: 5 * 60 * 1000,
    });
};

// ============ EXCHANGE RATE ============

export const useLatestExchangeRate = (currency = 'USD', options = {}) => {
    return useQuery({
        queryKey: [...payrollKeys.exchangeRate, currency],
        queryFn: async () => {
            const response = await axiosClient.get(`/exchange-rates/latest/?currency=${currency}`);
            return response.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutos
        ...options,
    });
};
