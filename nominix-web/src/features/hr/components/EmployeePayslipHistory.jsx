import React, { useState } from 'react';
import { useUnifiedPaymentHistory } from '../../../hooks/usePayroll';
import payrollService from '../../../services/payroll.service';
import { Download, Loader2, FileText, Calendar, Info } from 'lucide-react';

const EmployeePayslipHistory = ({ employeeId, employeeData }) => {
    // Usamos el nuevo hook unificado
    const { data: history = [], isLoading } = useUnifiedPaymentHistory({ employee: employeeId });
    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownload = async (item) => {
        if (!item.download_url) return;

        setDownloadingId(item.id);
        try {
            const empName = employeeData?.first_name
                ? `${employeeData.first_name}_${employeeData.last_name}`
                : 'historial';

            // Generamos un nombre descriptivo basado en el tipo
            const filename = `${item.type.toLowerCase()}_${empName}_${item.original_id}.pdf`;

            await payrollService.downloadFromUrl(item.download_url, filename);
        } catch (error) {
            console.error("Error al descargar el recibo:", error);
        } finally {
            setDownloadingId(null);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/D';
        return new Date(dateString).toLocaleDateString('es-VE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <Loader2 className="animate-spin mb-4 text-nominix-electric" size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest">Cargando Historial de Pagos...</p>
            </div>
        );
    }

    if (!history.length) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 border-4 border-dashed border-gray-50 rounded-[2rem]">
                <FileText size={48} className="mb-4 text-gray-200" />
                <p className="font-bold text-gray-500">El historial está vacío.</p>
                <p className="text-xs mt-1">Este colaborador no posee pagos registrados aún.</p>
            </div>
        );
    }

    // Badge styling based on transaction type
    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'PAYROLL': return 'bg-blue-100 text-blue-700';
            case 'VACATION': return 'bg-orange-100 text-orange-700';
            case 'BENEFITS_ADVANCE': return 'bg-purple-100 text-purple-700';
            case 'SETTLEMENT': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-xl">
                    <FileText className="text-blue-600" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800">Historial de Pagos</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                        Nómina, Vacaciones, Prestaciones y Liquidaciones
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] uppercase text-gray-400 font-black tracking-[0.2em] border-b-2 border-slate-100">
                            <th className="px-4 py-3">Concepto / Fecha</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3 text-right">Monto Pagado</th>
                            <th className="px-4 py-3 text-center">Referencia PDF</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {history.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className="font-bold text-sm text-slate-700">
                                        {item.description}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-widest">
                                        <Calendar size={12} />
                                        {formatDate(item.date)}
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`inline-block px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${getTypeBadgeClass(item.type)}`}>
                                        {item.type_label}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <span className="inline-block px-3 py-1 bg-nominix-electric/10 text-nominix-electric rounded-lg font-black text-sm">
                                        {formatCurrency(item.amount_ves)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center flex justify-center">
                                    {item.download_url ? (
                                        <button
                                            onClick={() => handleDownload(item)}
                                            disabled={downloadingId === item.id}
                                            className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all disabled:opacity-50"
                                            title="Descargar PDF"
                                        >
                                            {downloadingId === item.id ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : (
                                                <Download size={18} />
                                            )}
                                        </button>
                                    ) : (
                                        <div className="p-2.5 text-gray-300" title="PDF no disponible para este movimiento">
                                            <Info size={18} />
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployeePayslipHistory;
