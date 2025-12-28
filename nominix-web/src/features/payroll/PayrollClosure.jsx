import React, { useState, useEffect } from 'react';
import payrollService from '../../services/payroll.service';
import {
    Lock,
    Unlock,
    FileText,
    Download,
    PlayCircle,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    X,
    TrendingUp,
    Users,
    DollarSign
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * PayrollClosure - Módulo de Cierre Masivo y Reportes Históricos.
 */
const PayrollClosure = () => {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        loadPeriods();
    }, []);

    const loadPeriods = async () => {
        setLoading(true);
        try {
            const data = await payrollService.getPeriods();
            // Ordenar: Abiertos primero, luego por fecha de pago desc
            const sorted = data.sort((a, b) => {
                if (a.status === 'OPEN' && b.status === 'CLOSED') return -1;
                if (a.status === 'CLOSED' && b.status === 'OPEN') return 1;
                return new Date(b.payment_date) - new Date(a.payment_date);
            });
            setPeriods(sorted);
        } catch (error) {
            console.error("Error al cargar periodos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteClosure = async (period, manualRateInput = null) => {
        if (!manualRateInput) {
            const confirmMsg = `¿Está seguro de cerrar definitivamente la nómina: "${period.name}"?\n\nEsta acción es irreversible, generará los recibos inmutables y congelará la tasa de cambio oficial.`;
            if (!window.confirm(confirmMsg)) return;
        }

        setProcessingId(period.id);
        try {
            const result = await payrollService.closePeriod(period.id, manualRateInput);
            setSuccessData({
                ...result,
                periodName: period.name
            });
            await loadPeriods();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "";

            // Si el error es específicamente por falta de tasa BCV
            if (errorMsg.includes("No hay una tasa BCV válida")) {
                const manual = window.prompt(
                    "⚠️ No se encontró la tasa BCV oficial para esta fecha.\n\nPor favor, ingrese la tasa de cambio (Bs/USD) manualmente para proceder:",
                    "0.00"
                );

                if (manual && !isNaN(parseFloat(manual)) && parseFloat(manual) > 0) {
                    handleExecuteClosure(period, parseFloat(manual));
                } else {
                    alert("Operación cancelada. Se requiere una tasa válida para el cierre.");
                }
            } else {
                alert(`Falla en el Cierre: ${errorMsg || "Error inesperado."}`);
            }
        } finally {
            if (!manualRateInput || processingId === period.id) {
                setProcessingId(null);
            }
        }
    };

    const downloadFile = (blob, filename) => {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    const handleDownloadBank = async (id, name) => {
        try {
            const blob = await payrollService.getBankFile(id);
            downloadFile(blob, `Transferencias_${name.replace(/ /g, '_')}.txt`);
        } catch (error) {
            alert("El archivo bancario no está disponible para este periodo.");
        }
    };

    const handleDownloadLegal = async (id, name) => {
        try {
            const blob = await payrollService.getLegalReport(id);
            downloadFile(blob, `Reporte_IVSS_${name.replace(/ /g, '_')}.xlsx`);
        } catch (error) {
            alert("El reporte legal no está disponible para este periodo.");
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse">
                <Loader2 className="animate-spin text-nominix-electric mb-4" size={40} />
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Cargando Control de Periodos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Grid de Periodos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {periods.map((period) => (
                    <div
                        key={period.id}
                        className={cn(
                            "relative bg-white rounded-3xl p-6 shadow-sm border-l-8 transition-all hover:shadow-xl",
                            period.status === 'OPEN' ? "border-nominix-electric" : "border-gray-200"
                        )}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                period.status === 'OPEN' ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"
                            )}
                            >
                                {period.status === 'OPEN' ? <Unlock size={12} /> : <Lock size={12} />}
                                {period.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{period.payment_date}</span>
                        </div>

                        <h4 className="text-xl font-black text-nominix-dark mb-2 leading-tight">{period.name}</h4>
                        <p className="text-xs text-gray-400 font-medium mb-8">
                            Pago correspondiente al lapso del {period.start_date} al {period.end_date}.
                        </p>

                        {period.status === 'OPEN' ? (
                            <div className="space-y-4">
                                <button
                                    onClick={() => handleExecuteClosure(period)}
                                    disabled={processingId !== null}
                                    className="w-full flex items-center justify-center gap-3 bg-nominix-electric hover:bg-nominix-dark text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-nominix-electric/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {processingId === period.id ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <PlayCircle size={18} />
                                    )}
                                    {processingId === period.id ? 'Procesando...' : 'Ejecutar Cierre Masivo'}
                                </button>
                                <div className="flex items-start gap-2 text-amber-500 bg-amber-50 p-4 rounded-2xl">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <p className="text-[9px] font-bold leading-relaxed uppercase tracking-wider">
                                        Asegúrese de cargar novedades antes de cerrar. Esta acción Snapshot es definitiva.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleDownloadBank(period.id, period.name)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-50 hover:bg-nominix-electric hover:text-white rounded-2xl border border-gray-100 transition-all group"
                                >
                                    <Download size={18} className="text-gray-400 group-hover:text-white" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-center">TXT Banco</span>
                                </button>
                                <button
                                    onClick={() => handleDownloadLegal(period.id, period.name)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-50 hover:bg-nominix-electric hover:text-white rounded-2xl border border-gray-100 transition-all group"
                                >
                                    <FileText size={18} className="text-gray-400 group-hover:text-white" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-center">Rep. IVSS</span>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal de Éxito Post-Cierre */}
            {successData && (
                <div className="fixed inset-0 bg-nominix-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] max-w-lg w-full p-10 relative shadow-2xl animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setSuccessData(null)}
                            className="absolute right-8 top-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-3xl font-black text-nominix-dark tracking-tight mb-2">Cierre Exitoso</h3>
                            <p className="text-gray-400 font-medium text-sm mb-10 px-4">
                                Se han consolidado los registros inmutables para el periodo <span className="text-nominix-electric font-bold">{successData.periodName}</span>.
                            </p>

                            <div className="grid grid-cols-3 gap-1 w-full mb-10">
                                <div className="bg-gray-50 p-6 rounded-l-[30px] border-r border-gray-200">
                                    <Users size={18} className="text-nominix-electric mx-auto mb-3" />
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Personal</p>
                                    <p className="text-lg font-black text-gray-900">{successData.processed_employees}</p>
                                </div>
                                <div className="bg-gray-50 p-6">
                                    <DollarSign size={18} className="text-green-500 mx-auto mb-3" />
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto (VES)</p>
                                    <p className="text-lg font-black text-gray-900 italic">{successData.total_payroll_ves.toLocaleString('es-VE')}</p>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-r-[30px]">
                                    <TrendingUp size={18} className="text-amber-500 mx-auto mb-3" />
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Tasa BCV</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">{successData.exchange_rate} Bs.</p>
                                </div>
                            </div>

                            {successData.warnings?.length > 0 && (
                                <div className="w-full bg-red-50 p-6 rounded-3xl text-left border border-red-100 mb-8 max-h-40 overflow-y-auto">
                                    <div className="flex items-center gap-2 mb-3 text-red-600">
                                        <AlertTriangle size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Advertencias Detectadas</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {successData.warnings.map((w, idx) => (
                                            <li key={idx} className="text-[10px] text-red-500 font-bold leading-tight flex gap-2">
                                                <span className="shrink-0">•</span> {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => setSuccessData(null)}
                                className="w-full bg-nominix-dark text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-nominix-electric transition-all shadow-xl active:scale-95"
                            >
                                Entendido, Volver al Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollClosure;
