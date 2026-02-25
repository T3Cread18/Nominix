import axiosClient from './axiosClient';

/**
 * Servicio para consultar las métricas e información del Home Dashboard.
 */
const dashboardService = {
    /**
     * Obtiene los KPIs principales (Empleados activos, nóminas abiertas, contratos por vencer).
     * @returns {Promise<Object>}
     */
    getMetrics: async () => {
        const response = await axiosClient.get('/dashboard/metrics/');
        return response.data;
    },

    /**
     * Obtiene las tareas pendientes (Vacaciones y préstamos por aprobar).
     * @returns {Promise<Object>}
     */
    getPendingTasks: async () => {
        const response = await axiosClient.get('/dashboard/tasks/');
        return response.data;
    },

    /**
     * Obtiene los próximos cumpleaños y aniversarios.
     * @returns {Promise<Array>}
     */
    getUpcomingEvents: async () => {
        const response = await axiosClient.get('/dashboard/events/');
        return response.data;
    }
};

export default dashboardService;
