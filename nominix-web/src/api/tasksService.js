import axiosClient from './axiosClient';

const API_BASE = '/audits'; // Mantendremos el string de ruta de App_Name de Django igual por simplicidad en local

export const tasksService = {
    /**
     * Obtiene la lista de tareas
     */
    getTasks: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.sede_id) params.append('sede_id', filters.sede_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.assignee_id) params.append('assignee_id', filters.assignee_id);

        const response = await axiosClient.get(`${API_BASE}/?${params.toString()}`);
        return response.data;
    },

    getTaskDetail: async (id) => {
        const response = await axiosClient.get(`${API_BASE}/${id}/`);
        return response.data;
    },

    createTask: async (taskData) => {
        const response = await axiosClient.post(`${API_BASE}/`, taskData);
        return response.data;
    },

    updateTaskStatus: async (id, status) => {
        const response = await axiosClient.patch(`${API_BASE}/${id}/status/`, { status });
        return response.data;
    },

    uploadEvidence: async (id, formData) => {
        const response = await axiosClient.post(`${API_BASE}/${id}/evidence/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Gestión de Checklists (Administración)
     */
    getChecklistTemplates: async () => {
        const response = await axiosClient.get(`${API_BASE}/templates/`);
        return response.data;
    },

    getChecklistTemplateDetail: async (id) => {
        const response = await axiosClient.get(`${API_BASE}/templates/${id}/`);
        return response.data;
    },

    createChecklistTemplate: async (data) => {
        const response = await axiosClient.post(`${API_BASE}/templates/`, data);
        return response.data;
    },

    updateChecklistTemplate: async (id, data) => {
        const response = await axiosClient.patch(`${API_BASE}/templates/${id}/`, data);
        return response.data;
    },

    deleteChecklistTemplate: async (id) => {
        const response = await axiosClient.delete(`${API_BASE}/templates/${id}/`);
        return response.data;
    },

    // Categorías e Ítems
    getTemplateCategories: async (templateId) => {
        const response = await axiosClient.get(`${API_BASE}/templates/${templateId}/categories/`);
        return response.data;
    },

    createCategory: async (templateId, data) => {
        const response = await axiosClient.post(`${API_BASE}/templates/${templateId}/categories/`, data);
        return response.data;
    },

    getCategoryItems: async (categoryId) => {
        const response = await axiosClient.get(`${API_BASE}/categories/${categoryId}/items/`);
        return response.data;
    },

    createItem: async (categoryId, data) => {
        const response = await axiosClient.post(`${API_BASE}/categories/${categoryId}/items/`, data);
        return response.data;
    },

    updateChecklistAnswer: async (taskId, itemId, data) => {
        // data puede ser { status, comments, image (File) }
        const formData = new FormData();
        if (data.status) formData.append('status', data.status);
        if (data.comments) formData.append('comments', data.comments);
        if (data.image) formData.append('image', data.image);

        const response = await axiosClient.patch(`${API_BASE}/${taskId}/checklist/${itemId}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};
