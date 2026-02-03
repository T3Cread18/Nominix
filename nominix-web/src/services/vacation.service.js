import axiosClient from '../api/axiosClient';

/**
 * Vacation Service
 * 
 * Endpoints:
 * - GET    /api/vacations/                      - Listar solicitudes
 * - POST   /api/vacations/                      - Crear solicitud
 * - GET    /api/vacations/{id}/                 - Detalle solicitud
 * - DELETE /api/vacations/{id}/                 - Eliminar solicitud (DRAFT)
 * - POST   /api/vacations/upload-bulk/          - Carga masiva Excel
 * - GET    /api/vacations/{id}/simulate/        - Simular cálculo monetario
 * - POST   /api/vacations/{id}/approve/         - Aprobar solicitud
 * - GET    /api/vacations/summary/?employee_id=X - Resumen vacacional
 * - GET    /api/vacation-balance/by-employee/?id=X - Movimientos por empleado
 * - GET    /api/holidays/                       - Lista de feriados
 * - POST   /api/vacations/accrue/               - Acumular días manualmente
 */

const vacationService = {
    /**
     * Obtiene todas las solicitudes de vacaciones.
     * @param {object} filters - Filtros opcionales (employee, status, vacation_type)
     */
    getRequests: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const url = params ? `/vacations/?${params}` : '/vacations/';
        const response = await axiosClient.get(url);
        return response.data.results || response.data;
    },

    /**
     * Crea una nueva solicitud de vacaciones.
     * @param {object} data - Datos de la solicitud
     */
    createRequest: async (data) => {
        const response = await axiosClient.post('/vacations/', data);
        return response.data;
    },

    /**
     * Obtiene el detalle de una solicitud.
     * @param {number|string} id - ID de la solicitud
     */
    getRequest: async (id) => {
        const response = await axiosClient.get(`/vacations/${id}/`);
        return response.data;
    },

    /**
     * Elimina una solicitud (solo DRAFT).
     * @param {number|string} id - ID de la solicitud
     */
    deleteRequest: async (id) => {
        const response = await axiosClient.delete(`/vacations/${id}/`);
        return response.data;
    },

    /**
     * Aprueba una solicitud de vacaciones.
     * @param {number|string} id - ID de la solicitud
     */
    approveRequest: async (id) => {
        const response = await axiosClient.post(`/vacations/${id}/approve/`);
        return response.data;
    },

    /**
     * Rechaza una solicitud de vacaciones.
     * @param {number|string} id - ID de la solicitud
     * @param {string} reason - Motivo del rechazo (opcional)
     */
    rejectRequest: async (id, reason = '') => {
        const response = await axiosClient.post(`/vacations/${id}/reject/`, { reason });
        return response.data;
    },

    /**
     * Simula el cálculo monetario de una solicitud.
     * @param {number|string} id - ID de la solicitud
     * @param {number} days - Días a simular (opcional)
     */
    simulate: async (id, days = null) => {
        const params = days ? `?days=${days}` : '';
        const response = await axiosClient.get(`/vacations/${id}/simulate/${params}`);
        return response.data;
    },

    /**
     * Obtiene el resumen vacacional de un empleado.
     * @param {number|string} employeeId - ID del empleado
     */
    getEmployeeSummary: async (employeeId) => {
        const response = await axiosClient.get(`/vacations/summary/?employee_id=${employeeId}`);
        return response.data;
    },

    /**
     * Obtiene el historial de movimientos de vacaciones de un empleado.
     * @param {number|string} employeeId - ID del empleado
     */
    getEmployeeBalance: async (employeeId) => {
        const response = await axiosClient.get(`/vacation-balance/by-employee/?id=${employeeId}`);
        return response.data;
    },

    /**
     * Carga masiva de solicitudes desde Excel.
     * @param {File} file - Archivo Excel
     */
    uploadBulk: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosClient.post('/vacations/upload-bulk/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Obtiene la lista de feriados.
     * @param {number} year - Año opcional para filtrar
     */
    getHolidays: async (year = null) => {
        const currentYear = year || new Date().getFullYear();
        const url = `/holidays/?year=${currentYear}`;
        try {
            const response = await axiosClient.get(url);
            return response.data.results || response.data;
        } catch (error) {
            // Si el endpoint no existe, retornar feriados nacionales de Venezuela
            console.warn('Holidays endpoint not available, using defaults');
            return [
                // Feriados fijos de Venezuela
                `${currentYear}-01-01`, // Año Nuevo
                `${currentYear}-04-19`, // Declaración de la Independencia
                `${currentYear}-05-01`, // Día del Trabajador
                `${currentYear}-06-24`, // Batalla de Carabobo
                `${currentYear}-07-05`, // Día de la Independencia
                `${currentYear}-07-24`, // Natalicio de Simón Bolívar
                `${currentYear}-10-12`, // Día de la Resistencia Indígena
                `${currentYear}-12-24`, // Nochebuena
                `${currentYear}-12-25`, // Navidad
                `${currentYear}-12-31`, // Fin de Año
            ];
        }
    },

    /**
     * Registra la acumulación HISTÓRICA de días de vacaciones para un empleado.
     * Acumula TODOS los años pendientes (ej: 8 años = 148 días total).
     * @param {number|string} employeeId - ID del empleado
     */
    accrueVacationDays: async (employeeId) => {
        const payload = { employee_id: employeeId };

        const response = await axiosClient.post('/vacations/accrue-historical/', payload);
        return response.data;
    },

    /**
     * Simula el pago completo de vacaciones incluyendo días de descanso y feriados.
     * @param {number|string} requestId - ID de la solicitud
     */
    simulateCompletePayment: async (requestId, paymentDate = null) => {
        const params = paymentDate ? `?payment_date=${paymentDate}` : '';
        const response = await axiosClient.get(`/vacations/${requestId}/simulate-complete/${params}`);
        return response.data;
    },

    /**
     * Procesa el pago de una solicitud de vacaciones aprobada.
     * @param {number|string} requestId - ID de la solicitud
     */
    processPayment: async (requestId, paymentDate = null) => {
        const payload = paymentDate ? { payment_date: paymentDate } : {};
        const response = await axiosClient.post(`/vacations/${requestId}/process-payment/`, payload);
        return response.data;
    },

    /**
     * Descarga el recibo de vacaciones en PDF.
     * @param {number|string} requestId - ID de la solicitud
     */
    downloadReceiptPdf: async (requestId) => {
        const response = await axiosClient.get(`/vacations/${requestId}/export-pdf/`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `recibo_vacaciones_${requestId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};

export default vacationService;
