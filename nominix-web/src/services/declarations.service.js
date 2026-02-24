import axiosClient from '../api/axiosClient';

/**
 * Fuerza descarga de archivo desde un Blob.
 */
const triggerFileDownload = (data, filename, contentType = 'application/octet-stream') => {
    const url = window.URL.createObjectURL(new Blob([data], { type: contentType }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

const declarationsService = {

    // =====================
    // LPPSS — Pensiones 9%
    // =====================
    calculateLPPSS: async (year, month) => {
        const response = await axiosClient.post('/declarations/lppss/calculate/', { year, month });
        return response.data;
    },

    // =====================
    // INCES — Patronal 2%
    // =====================
    calculateINCES: async (year, quarter) => {
        const response = await axiosClient.post('/declarations/inces/calculate/', { year, quarter });
        return response.data;
    },

    // =====================
    // EXPORTS — Archivos Planos
    // =====================
    downloadIVSS: async (type = 'INGRESO') => {
        const response = await axiosClient.get(`/exports/ivss/?type=${type}`, { responseType: 'blob' });
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        triggerFileDownload(response.data, `IVSS_${type}_${today}.txt`, 'text/plain');
    },

    downloadFAOV: async (year, month) => {
        const response = await axiosClient.get(`/exports/faov/?year=${year}&month=${month}`, { responseType: 'blob' });
        triggerFileDownload(response.data, `FAOV_${year}${String(month).padStart(2, '0')}.txt`, 'text/plain');
    },

    downloadISLRXML: async (year, month) => {
        const response = await axiosClient.get(`/exports/islr-xml/?year=${year}&month=${month}`, { responseType: 'blob' });
        triggerFileDownload(response.data, `ISLR_${year}${String(month).padStart(2, '0')}.xml`, 'application/xml');
    },

    // =====================
    // REPORTS — Reportes
    // =====================
    downloadConstanciaTrabajo: async (employeeId, showSalary = true) => {
        const response = await axiosClient.get(
            `/reports/constancia-trabajo/${employeeId}/?show_salary=${showSalary}`,
            { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        window.open(url, '_blank');
    },

    downloadPayrollReceiptsBatch: async (periodId, tipo = 'todos') => {
        const response = await axiosClient.get(
            `/payroll-periods/${periodId}/export-pdf/?tipo=${tipo}`,
            { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        window.open(url, '_blank');
    },

    downloadSimulationSettlementPdf: async (contractId, terminationDate = null) => {
        let endpoint = `/social-benefits/export-simulation-pdf/?contract_id=${contractId}`;
        if (terminationDate) {
            endpoint += `&termination_date=${terminationDate}`;
        }

        const response = await axiosClient.get(endpoint, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        window.open(url, '_blank');
    },

    downloadPayrollExcel: async (periodId, periodName = '') => {
        const response = await axiosClient.get(`/reports/excel/${periodId}/`, { responseType: 'blob' });
        triggerFileDownload(
            response.data,
            `nomina_resumen_${periodName || periodId}.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    },
};

export default declarationsService;
