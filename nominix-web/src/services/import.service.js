import axiosClient from '../api/axiosClient';

const importService = {
    getFields: (model) => axiosClient.get(`/import/${model}/fields/`),

    previewFile: (formData) => axiosClient.post('/import/preview/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),

    validateImport: (model, formData, mapping) => {
        // Append mapping to formData if not already there, or send as separate field if API expects it
        // My backend expects 'file' and 'mapping' in form data
        formData.append('mapping', JSON.stringify(mapping));
        return axiosClient.post(`/import/${model}/validate/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    executeImport: (model, formData, mapping) => {
        formData.append('mapping', JSON.stringify(mapping));
        return axiosClient.post(`/import/${model}/execute/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    downloadTemplate: async (model, format = 'xlsx') => {
        // Updated URL to avoid conflicts with /import/
        const response = await axiosClient.get(`/templates/${model}/?format=${format}`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        link.setAttribute('download', `plantilla_${model}.${ext}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};

export default importService;
