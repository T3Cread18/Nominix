import axiosClient from '../api/axiosClient';

/**
 * payrollService - Servicio para la gestión de cierres y periodos de nómina.
 */
const payrollService = {
    /**
     * Obtiene la lista de todos los periodos registrados.
     */
    getPeriods: async () => {
        const response = await axiosClient.get('/payroll-periods/');
        return response.data.results || response.data;
    },

    /**
     * Ejecuta el proceso de cálculo masivo e inmutabilidad para un periodo.
     * @param {number|string} id ID del periodo a cerrar.
     * @param {number|null} manual_rate Tasa de cambio manual (opcional).
     */
    closePeriod: async (id, manual_rate = null) => {
        const response = await axiosClient.post(`/payroll-periods/${id}/close-period/`, {
            manual_rate
        });
        return response.data;
    },

    /**
     * Descarga el archivo de transferencia bancaria (TXT/Excel).
     * @param {number|string} id ID del periodo.
     */
    getBankFile: async (id) => {
        const response = await axiosClient.get(`/payroll-periods/${id}/export-bank/`, {
            responseType: 'blob',
        });
        return response.data;
    },

    /**
     * Descarga el reporte legal para el IVSS/TIUNA.
     * @param {number|string} id ID del periodo.
     */
    getLegalReport: async (id) => {
        const response = await axiosClient.get(`/payroll-periods/${id}/export-ivss/`, {
            responseType: 'blob',
        });
        return response.data;
    }
};

export default payrollService;
