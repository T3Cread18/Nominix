import axiosClient from '../api/axiosClient';

const vacationsService = {
    // --- SALDOS DE VACACIONES ---

    /**
     * Obtiene los saldos de vacaciones de un empleado.
     * @param {number|string} employeeId - ID del empleado
     * @returns {Promise<Array>} Lista de saldos ordenados por año
     */
    getBalances: async (employeeId) => {
        const response = await axiosClient.get(`/vacation-balances/?employee=${employeeId}`);
        return response.data;
    },

    /**
     * Genera un saldo de vacaciones para un año específico.
     * @param {number|string} employeeId 
     * @param {number} serviceYear 
     */
    generateBalance: async (employeeId, serviceYear) => {
        const response = await axiosClient.post('/vacation-balances/generate/', {
            employee_id: employeeId,
            service_year: serviceYear
        });
        return response.data;
    },

    /**
     * Genera saldos faltantes para un empleado (histórico).
     * @param {number|string} employeeId 
     */
    generateMissingBalances: async (employeeId) => {
        const response = await axiosClient.post('/vacation-balances/generate-missing/', {
            employee_id: employeeId
        });
        return response.data;
    },

    // --- CÁLCULO DE FECHAS (DÍAS HÁBILES) ---

    /**
     * Genera el pago anticipado de vacaciones.
     * @param {number|string} balanceId 
     */
    generateAdvance: async (balanceId) => {
        const response = await axiosClient.post(`/vacation-balances/${balanceId}/generate-advance/`);
        return response.data;
    },

    /**
     * Calcula la fecha fin de vacaciones basada en días hábiles.
     * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
     * @param {number} days - Cantidad de días hábiles
     * @returns {Promise<{end_date: string, calendar_days: number, return_to_work_date: string}>}
     */
    calculateEndDate: async (startDate, days) => {
        const response = await axiosClient.post('/employee-variations/calculate-end-date/', {
            start_date: startDate,
            days: days
        });
        return response.data;
    }
};

export default vacationsService;
