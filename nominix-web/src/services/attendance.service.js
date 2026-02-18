import axiosClient from '../api/axiosClient';

/**
 * Attendance Service
 * 
 * Endpoints (backend: /api/biometric/):
 * - GET/POST       /api/biometric/devices/                    - CRUD dispositivos
 * - GET/PUT/DELETE  /api/biometric/devices/{id}/               - Detalle dispositivo
 * - POST            /api/biometric/devices/{id}/test_connection/ - Test conexión
 * - POST            /api/biometric/devices/{id}/sync_events/    - Sincronizar eventos
 * - GET             /api/biometric/devices/{id}/device_users/   - Usuarios del dispositivo
 * - POST            /api/biometric/devices/sync_all/            - Sincronizar todos
 * - GET/POST        /api/biometric/device-types/                - Tipos de dispositivo
 * - GET             /api/biometric/events/                      - Eventos de asistencia
 * - GET/POST        /api/biometric/mappings/                    - Mapeos empleado-dispositivo
 */

const attendanceService = {
    // ==================== DISPOSITIVOS ====================

    /** Obtiene todos los dispositivos registrados */
    getDevices: async () => {
        const response = await axiosClient.get('/biometric/devices/');
        return response.data.results || response.data;
    },

    /** Obtiene un dispositivo por ID */
    getDevice: async (id) => {
        const response = await axiosClient.get(`/biometric/devices/${id}/`);
        return response.data;
    },

    /** Crea un nuevo dispositivo */
    createDevice: async (data) => {
        const response = await axiosClient.post('/biometric/devices/', data);
        return response.data;
    },

    /** Actualiza un dispositivo */
    updateDevice: async (id, data) => {
        const response = await axiosClient.put(`/biometric/devices/${id}/`, data);
        return response.data;
    },

    /** Elimina un dispositivo */
    deleteDevice: async (id) => {
        const response = await axiosClient.delete(`/biometric/devices/${id}/`);
        return response.data;
    },

    /** Prueba la conexión con un dispositivo */
    testConnection: async (id) => {
        const response = await axiosClient.post(`/biometric/devices/${id}/test_connection/`);
        return response.data;
    },

    /** Sincroniza eventos de un dispositivo */
    syncEvents: async (id, data = {}) => {
        const response = await axiosClient.post(`/biometric/devices/${id}/sync_events/`, data);
        return response.data;
    },

    /** Sincroniza todos los dispositivos */
    syncAll: async (data = {}) => {
        const response = await axiosClient.post('/biometric/devices/sync_all/', data);
        return response.data;
    },

    /** Obtiene los usuarios registrados en un dispositivo */
    getDeviceUsers: async (id) => {
        const response = await axiosClient.get(`/biometric/devices/${id}/device_users/`);
        return response.data;
    },

    // ==================== TIPOS DE DISPOSITIVO ====================

    /** Obtiene todos los tipos de dispositivo */
    getDeviceTypes: async () => {
        const response = await axiosClient.get('/biometric/device-types/');
        return response.data.results || response.data;
    },

    // ==================== EVENTOS ====================

    /**
     * Obtener eventos directamente del dispositivo (sin guardar).
     * @param {number} id - ID del dispositivo
     * @param {object} params - { page, page_size, start_time, end_time }
     */
    getDeviceEvents: async (id, params = {}) => {
        const response = await axiosClient.get(`/biometric/devices/${id}/get_events/`, { params });
        return response.data;
    },

    /** 
     * Obtiene eventos de asistencia con filtros opcionales y paginación.
     * @param {object} filters - { date_from, date_to, employee, event_type, device, page, page_size }
     * @returns {{ count: number, next: string|null, previous: string|null, results: Array }}
     */
    getEvents: async (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value);
            }
        });
        const query = params.toString();
        const url = query ? `/biometric/events/?${query}` : '/biometric/events/';
        const response = await axiosClient.get(url);
        // DRF paginated response: { count, next, previous, results }
        if (response.data && response.data.results !== undefined) {
            return response.data;
        }
        // Fallback for non-paginated response
        return { count: response.data.length, results: response.data, next: null, previous: null };
    },

    // ==================== ASISTENCIA DIARIA ====================

    /**
     * Obtiene el resumen diario de asistencia (agregado).
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @param {object} params - { branch, search }
     */
    getDailyAttendance: async (date, params = {}) => {
        const queryParams = { ...params };
        if (date) queryParams.date = date;
        const response = await axiosClient.get('/biometric/daily-attendance/', { params: queryParams });
        return response.data;
    },

    // ==================== MAPEOS ====================

    /** Obtiene todos los mapeos empleado-dispositivo */
    getMappings: async (params = {}) => {
        const response = await axiosClient.get('/biometric/mappings/', { params });
        if (response.data && response.data.results !== undefined) {
            return response.data;
        }
        return { count: response.data.length, results: response.data };
    },

    /**
     * Obtiene estadísticas rápidas de eventos para un día.
     * @param {string} date - YYYY-MM-DD
     */
    getSummary: async (date) => {
        const response = await axiosClient.get('/biometric/events/summary/', { params: { date } });
        return response.data;
    },

    /** Crea un nuevo mapeo empleado-dispositivo */
    createMapping: async (data) => {
        const response = await axiosClient.post('/biometric/mappings/', data);
        return response.data;
    },

    /** Actualiza un mapeo */
    updateMapping: async (id, data) => {
        const response = await axiosClient.put(`/biometric/mappings/${id}/`, data);
        return response.data;
    },

    /** Elimina un mapeo */
    deleteMapping: async (id) => {
        const response = await axiosClient.delete(`/biometric/mappings/${id}/`);
        return response.data;
    },
};

export default attendanceService;
