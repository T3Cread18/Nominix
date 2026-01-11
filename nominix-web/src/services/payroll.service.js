import axiosClient from '../api/axiosClient';

/**
 * Función auxiliar para forzar la descarga en el navegador desde un Blob.
 * Evita repetir código en cada método de descarga.
 */
const triggerFileDownload = (data, filename) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url); // Buena práctica: liberar memoria
};

const payrollService = {
    /**
     * Obtiene la lista de todos los periodos registrados.
     */
    getPeriods: async () => {
        const response = await axiosClient.get('/payroll-periods/');
        return response.data.results || response.data;
    },

    /**
     * Crea un nuevo periodo de nómina.
     */
    createPeriod: async (data) => {
        const response = await axiosClient.post('/payroll-periods/', data);
        return response.data;
    },

    /**
     * Descarga el PDF masivo de recibos.
     * @param {string} receiptType - 'todos' | 'salario' | 'complemento' | 'cestaticket'
     */
    downloadPdf: async (periodId, periodName, receiptType = 'todos') => {
        try {
            const params = receiptType !== 'todos' ? `?tipo=${receiptType}` : '';
            const response = await axiosClient.get(`/payroll-periods/${periodId}/export-pdf/${params}`, {
                responseType: 'blob'
            });
            const suffix = receiptType !== 'todos' ? `_${receiptType}` : '';
            triggerFileDownload(response.data, `nomina_recibos${suffix}_${periodName || periodId}.pdf`);
        } catch (error) {
            console.error("Error descargando PDF", error);
            throw error;
        }
    },

    /**
     * Descarga el reporte financiero (CSV/Excel).
     */
    downloadFinanceReport: async (periodId, periodName) => {
        try {
            const response = await axiosClient.get(`/payroll-periods/${periodId}/export-finance/`, {
                responseType: 'blob'
            });
            triggerFileDownload(response.data, `${Date.now()}_finanzas_nomina_${periodName || periodId}.csv`);
        } catch (error) {
            console.error("Error descargando Reporte Finanzas", error);
            throw error;
        }
    },

    /**
     * Ejecuta el proceso de cálculo masivo e inmutabilidad para un periodo.
     * @param {number|string} id ID del periodo a cerrar.
     * @param {number} manualRate (Opcional) Tasa manual si falla BCV.
     */
    closePeriod: async (id, manualRate = null) => {
        const payload = manualRate ? { manual_rate: manualRate } : {};
        const response = await axiosClient.post(`/payroll-periods/${id}/close-period/`, payload);
        return response.data;
    },

    /**
     * Obtiene los recibos de pago de un periodo específico.
     */
    getPayslips: async (periodId) => {
        const response = await axiosClient.get(`/payslips/?period=${periodId}`);
        return response.data.results || response.data;
    },

    /**
     * Previsualiza los resultados de la nómina para un periodo.
     * @param {number|string} id ID del periodo.
     * @param {number} manualRate (Opcional) Tasa manual.
     */
    previewPayroll: async (id, manualRate = null) => {
        const payload = manualRate ? { manual_rate: manualRate } : {};
        const response = await axiosClient.post(`/payroll-periods/${id}/preview-payroll/`, payload);
        return response.data;
    },

    /**
     * Descarga el PDF individual de un recibo.
     */
    downloadSinglePayslipPdf: async (payslipId, employeeName) => {
        try {
            const response = await axiosClient.get(`/payslips/${payslipId}/export-pdf/`, {
                responseType: 'blob'
            });
            triggerFileDownload(response.data, `recibo_${employeeName || payslipId}.pdf`);
        } catch (error) {
            console.error("Error descargando recibo individual", error);
            throw error;
        }
    },

    // DEPRECATED: Se mantienen por compatibilidad si se requieren a futuro
    getBankFile: async (id) => { throw new Error("Usar downloadFinanceReport"); },
    getLegalReport: async (id) => { throw new Error("Usar downloadFinanceReport"); },

    /**
     * Obtiene la configuración de la empresa (para visibilidad en recibos).
     */
    getCompanyConfig: async () => {
        const response = await axiosClient.get('/company/config/');
        return response.data;
    }
};

export default payrollService;