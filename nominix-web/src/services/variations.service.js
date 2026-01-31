import axiosClient from '../api/axiosClient';

const variationsService = {
    // --- CAUSAS DE VARIACIÓN ---
    getCauses: async () => {
        const response = await axiosClient.get('/variation-causes/');
        return response.data.results || response.data;
    },

    createCause: async (data) => {
        const response = await axiosClient.post('/variation-causes/', data);
        return response.data;
    },

    updateCause: async (id, data) => {
        const response = await axiosClient.patch(`/variation-causes/${id}/`, data);
        return response.data;
    },

    deleteCause: async (id) => {
        const response = await axiosClient.delete(`/variation-causes/${id}/`);
        return response.data;
    },

    // --- VARIACIONES DE EMPLEADO ---
    getEmployeeVariations: async (employeeId) => {
        const response = await axiosClient.get(`/employee-variations/?employee=${employeeId}`);
        return response.data.results || response.data;
    },

    createEmployeeVariation: async (data) => {
        const response = await axiosClient.post('/employee-variations/', data);
        return response.data;
    },

    updateEmployeeVariation: async (id, data) => {
        const response = await axiosClient.patch(`/employee-variations/${id}/`, data);
        return response.data;
    },

    deleteEmployeeVariation: async (id) => {
        const response = await axiosClient.delete(`/employee-variations/${id}/`);
        return response.data;
    },

    // --- PREVIEW DE NOVEDADES ---
    getNoveltiesPreview: async (periodId) => {
        const response = await axiosClient.get(`/payroll-novelties/preview/?period=${periodId}`);
        return response.data;
    },

    // --- EXPORTAR RECIBO (PDF) ---
    exportPdf: async (variationId) => {
        const response = await axiosClient.get(`/employee-variations/${variationId}/export-pdf/`, {
            responseType: 'blob'
        });

        // Crear un link temporal para la descarga
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `recibo_vacaciones_${variationId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        return true;
    }
};

export default variationsService;
