import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import socialBenefitsService from '../services/socialBenefits.service';
import { getErrorMessage } from '../api/axiosClient';
import { toast } from 'sonner';

export const socialBenefitsKeys = {
    all: ['social-benefits'],
    ledgers: () => [...socialBenefitsKeys.all, 'ledger'],
    ledger: (filters) => [...socialBenefitsKeys.ledgers(), filters],
    balances: () => [...socialBenefitsKeys.all, 'balance'],
    balance: (id) => [...socialBenefitsKeys.balances(), id],
    simulations: () => [...socialBenefitsKeys.all, 'simulation'],
    simulation: (contractId, date) => [...socialBenefitsKeys.simulations(), contractId, date],
    bcvRates: ['bcv-rates'],
};

/**
 * useSocialBenefitsLedger - Obtiene el historial de movimientos.
 */
export const useSocialBenefitsLedger = (filters = {}, options = {}) => {
    return useQuery({
        queryKey: socialBenefitsKeys.ledger(filters),
        queryFn: () => socialBenefitsService.getLedger(filters),
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

/**
 * useSocialBenefitsBalance - Obtiene el saldo actual.
 */
export const useSocialBenefitsBalance = (employeeId, options = {}) => {
    return useQuery({
        queryKey: socialBenefitsKeys.balance(employeeId),
        queryFn: () => socialBenefitsService.getBalance(employeeId),
        enabled: !!employeeId,
        ...options,
    });
};

/**
 * useSettlementSimulation - Simula la liquidación final.
 */
export const useSettlementSimulation = (contractId, terminationDate, options = {}) => {
    return useQuery({
        queryKey: socialBenefitsKeys.simulation(contractId, terminationDate),
        queryFn: () => socialBenefitsService.simulateSettlement(contractId, terminationDate),
        enabled: !!contractId,
        staleTime: 10 * 1000, // Los datos de contrato pueden cambiar durante la carga
        ...options,
    });
};

/**
 * useRunQuarterlyMutation - Procesa el abono trimestral.
 */
export const useRunQuarterlyMutation = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: socialBenefitsService.runQuarterly,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: socialBenefitsKeys.all });
            toast.success('Garantía trimestral procesada con éxito');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        }
    });
};

/**
 * useRequestAdvanceMutation - Solicita un anticipo.
 */
export const useRequestAdvanceMutation = (options = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: socialBenefitsService.requestAdvance,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: socialBenefitsKeys.all });
            toast.success('Anticipo registrado correctamente');
            options.onSuccess?.(data);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
            options.onError?.(error);
        }
    });
};

/**
 * useBCVRates - Obtiene las tasas del BCV.
 */
export const useBCVRates = (options = {}) => {
    return useQuery({
        queryKey: socialBenefitsKeys.bcvRates,
        queryFn: socialBenefitsService.getBCVRates,
        ...options
    });
};
