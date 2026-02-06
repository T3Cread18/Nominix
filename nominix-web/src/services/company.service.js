import api from '../api/axiosClient';

const companyService = {
    /**
     * Obtiene la configuración de la empresa
     * @returns {Promise<Object>} Datos de la empresa
     */
    getConfig: async () => {
        const response = await api.get('/payroll/company/config/');
        return response.data;
    },

    /**
     * Actualiza la configuración de la empresa
     * @param {Object} data - Datos parciales a actualizar
     * @returns {Promise<Object>} Datos actualizados
     */
    updateConfig: async (data) => {
        const response = await api.put('/payroll/company/config/', data);
        return response.data;
    }
};

export default companyService;
