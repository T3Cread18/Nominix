import axiosClient from '../api/axiosClient';

/**
 * socialBenefitsService - Abstracción de llamadas al API de Prestaciones Sociales.
 */
const socialBenefitsService = {
    /**
     * Obtiene los movimientos del libro auxiliar (ledger) Filtrados por empleado o contrato.
     */
    getLedger: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.employee) params.append('employee', filters.employee);
        if (filters.contract) params.append('contract', filters.contract);
        if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);

        const response = await axiosClient.get(`/social-benefits/?${params.toString()}`);
        return response.data.results || response.data;
    },

    /**
     * Obtiene el saldo actual de un empleado.
     */
    getBalance: async (employeeId) => {
        const response = await axiosClient.get(`/social-benefits/balance/?employee_id=${employeeId}`);
        return response.data;
    },

    /**
     * Procesa la garantía trimestral (15 días).
     */
    runQuarterly: async (data) => {
        const response = await axiosClient.post('/social-benefits/run-quarterly/', data);
        return response.data;
    },

    /**
     * Simula la liquidación final.
     */
    simulateSettlement: async (contractId, terminationDate = null) => {
        let url = `/social-benefits/simulate-settlement/?contract_id=${contractId}`;
        if (terminationDate) url += `&termination_date=${terminationDate}`;

        const response = await axiosClient.get(url);
        return response.data;
    },

    /**
     * Solicita un anticipo de prestaciones.
     */
    requestAdvance: async (data) => {
        const response = await axiosClient.post('/social-benefits/request-advance/', data);
        return response.data;
    },

    /**
     * Gestión de Tasas BCV
     */
    getBCVRates: async () => {
        const response = await axiosClient.get('/bcv-rates/');
        return response.data.results || response.data;
    },

    createBCVRate: async (data) => {
        const response = await axiosClient.post('/bcv-rates/', data);
        return response.data;
    }
};

export default socialBenefitsService;
