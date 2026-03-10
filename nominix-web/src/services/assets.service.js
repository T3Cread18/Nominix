import axiosClient from '../api/axiosClient';

/**
 * Assets Service
 * 
 * Endpoints (backend: /api/assets/):
 * - CRUD  /api/assets/categories/        - Categorías de activos
 * - CRUD  /api/assets/warehouses/         - Almacenes
 * - CRUD  /api/assets/invoices/           - Facturas de adquisición
 * - CRUD  /api/assets/items/              - Activos fijos
 * - POST  /api/assets/items/{id}/upload-photo/ - Subir foto
 * - GET   /api/assets/items/summary/      - Resumen general
 * - CRUD  /api/assets/movements/          - Movimientos / guías
 * - POST  /api/assets/movements/{id}/dispatch/  - Despachar
 * - POST  /api/assets/movements/{id}/receive/   - Recibir
 * - POST  /api/assets/movements/{id}/cancel/    - Cancelar
 * - GET   /api/assets/valuation/          - Avalúo por sede
 * - CRUD  /api/assets/audits/             - Auditorías
 */

const assetsService = {
    // ==================== CATEGORÍAS ====================
    getCategories: async () => {
        const response = await axiosClient.get('/assets/categories/');
        return response.data.results || response.data;
    },
    createCategory: async (data) => {
        const response = await axiosClient.post('/assets/categories/', data);
        return response.data;
    },
    updateCategory: async (id, data) => {
        const response = await axiosClient.patch(`/assets/categories/${id}/`, data);
        return response.data;
    },
    deleteCategory: async (id) => {
        await axiosClient.delete(`/assets/categories/${id}/`);
    },

    // ==================== ALMACENES ====================
    getWarehouses: async (params = {}) => {
        const response = await axiosClient.get('/assets/warehouses/', { params });
        return response.data.results || response.data;
    },
    createWarehouse: async (data) => {
        const response = await axiosClient.post('/assets/warehouses/', data);
        return response.data;
    },
    updateWarehouse: async (id, data) => {
        const response = await axiosClient.patch(`/assets/warehouses/${id}/`, data);
        return response.data;
    },
    deleteWarehouse: async (id) => {
        await axiosClient.delete(`/assets/warehouses/${id}/`);
    },

    // ==================== FACTURAS ====================
    getInvoices: async (params = {}) => {
        const response = await axiosClient.get('/assets/invoices/', { params });
        return response.data.results || response.data;
    },
    createInvoice: async (data) => {
        const response = await axiosClient.post('/assets/invoices/', data);
        return response.data;
    },
    updateInvoice: async (id, data) => {
        const response = await axiosClient.patch(`/assets/invoices/${id}/`, data);
        return response.data;
    },

    // ==================== ACTIVOS ====================
    getAssets: async (params = {}) => {
        const response = await axiosClient.get('/assets/items/', { params });
        return response.data;
    },
    getAsset: async (id) => {
        const response = await axiosClient.get(`/assets/items/${id}/`);
        return response.data;
    },
    createAsset: async (data) => {
        const response = await axiosClient.post('/assets/items/', data);
        return response.data;
    },
    updateAsset: async (id, data) => {
        const response = await axiosClient.patch(`/assets/items/${id}/`, data);
        return response.data;
    },
    deleteAsset: async (id) => {
        await axiosClient.delete(`/assets/items/${id}/`);
    },
    getAssetSummary: async () => {
        const response = await axiosClient.get('/assets/items/summary/');
        return response.data;
    },
    uploadPhoto: async (assetId, file, isPrimary = false) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('is_primary', isPrimary);
        const response = await axiosClient.post(
            `/assets/items/${assetId}/upload-photo/`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    // ==================== MOVIMIENTOS ====================
    getMovements: async (params = {}) => {
        const response = await axiosClient.get('/assets/movements/', { params });
        return response.data.results || response.data;
    },
    getMovement: async (id) => {
        const response = await axiosClient.get(`/assets/movements/${id}/`);
        return response.data;
    },
    createMovement: async (data) => {
        const response = await axiosClient.post('/assets/movements/', data);
        return response.data;
    },
    updateMovement: async (id, data) => {
        const response = await axiosClient.patch(`/assets/movements/${id}/`, data);
        return response.data;
    },
    dispatchMovement: async (id) => {
        const response = await axiosClient.post(`/assets/movements/${id}/dispatch/`);
        return response.data;
    },
    receiveMovement: async (id) => {
        const response = await axiosClient.post(`/assets/movements/${id}/receive/`);
        return response.data;
    },
    cancelMovement: async (id) => {
        const response = await axiosClient.post(`/assets/movements/${id}/cancel/`);
        return response.data;
    },

    // ==================== AVALÚO ====================
    getValuation: async () => {
        const response = await axiosClient.get('/assets/valuation/');
        return response.data;
    },

    // ==================== AUDITORÍAS ====================
    getAudits: async (params = {}) => {
        const response = await axiosClient.get('/assets/audits/', { params });
        return response.data.results || response.data;
    },
    createAudit: async (data) => {
        const response = await axiosClient.post('/assets/audits/', data);
        return response.data;
    },
    addAuditItem: async (auditId, data) => {
        const response = await axiosClient.post(`/assets/audits/${auditId}/add-item/`, data);
        return response.data;
    },
    completeAudit: async (auditId) => {
        const response = await axiosClient.post(`/assets/audits/${auditId}/complete/`);
        return response.data;
    },

    // ==================== DEPRECIACIÓN ====================
    getDepreciationRecords: async (params = {}) => {
        const response = await axiosClient.get('/assets/depreciation/', { params });
        return response.data.results || response.data;
    },
    depreciateAsset: async (assetId, periodDate = null) => {
        const response = await axiosClient.post(`/assets/items/${assetId}/depreciate/`, {
            period_date: periodDate,
        });
        return response.data;
    },
    getDepreciationSchedule: async (assetId) => {
        const response = await axiosClient.get(`/assets/items/${assetId}/schedule/`);
        return response.data;
    },
    batchDepreciate: async (periodDate = null) => {
        const response = await axiosClient.post('/assets/depreciation/batch/', {
            period_date: periodDate,
        });
        return response.data;
    },

    // ==================== OCR ====================
    ocrExtract: async (imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        const response = await axiosClient.post('/assets/items/ocr-extract/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // ==================== UTILIDADES ====================
    getBranches: async () => {
        const response = await axiosClient.get('/branches/');
        return response.data.results || response.data;
    },
};

export default assetsService;
