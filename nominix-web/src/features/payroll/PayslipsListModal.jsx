import React, { useState, useEffect } from 'react';
import { X, Search, User, DollarSign, Calculator, Download, Loader2, Eye } from 'lucide-react';
import payrollService from '../../services/payroll.service';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * PayslipsListModal - Muestra la lista de recibos generados para un periodo.
 */
const PayslipsListModal = ({ isOpen, onClose, period }) => {
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        if (isOpen && period) {
            loadPayslips();
        }
    }, [isOpen, period]);

    const loadPayslips = async () => {
        setLoading(true);
        try {
            const data = await payrollService.getPayslips(period.id);
            setPayslips(data);
        } catch (error) {
            console.error("Error al cargar recibos:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPayslips = payslips.filter(p =>
        p.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);
    };

    const handleDownloadPayslip = async (payslip) => {
        setDownloadingId(payslip.id);
        try {
            await payrollService.downloadSinglePayslipPdf(payslip.id, payslip.employee_name);
        } catch (error) {
            alert("No se pudo descargar el recibo individual.");
        } finally {
            setDownloadingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Calculator className="text-nominix-electric" size={28} />
                            Recibos del Periodo
                        </h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {period?.name} ({period?.status === 'OPEN' ? 'PROYECTO' : 'CIERRE'})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-gray-400 hover:text-slate-800"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar / Search */}
                <div className="p-6 bg-white flex items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-nominix-electric transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre de colaborador..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-nominix-electric/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="animate-spin mb-4 text-nominix-electric" size={40} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Consultando Registros...</p>
                        </div>
                    ) : filteredPayslips.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-300 border-4 border-dashed border-gray-50 rounded-[2rem]">
                            <p className="font-bold">No se encontraron recibos generados aún.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] uppercase text-gray-400 font-black tracking-[0.2em]">
                                        <th className="px-4 py-3">Colaborador</th>
                                        <th className="px-4 py-3 text-right">Asignaciones</th>
                                        <th className="px-4 py-3 text-right">Deducciones</th>
                                        <th className="px-4 py-3 text-right">Neto a Pagar</th>
                                        <th className="px-4 py-3 text-center">Tasa</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredPayslips.map((p) => (
                                        <tr key={p.id} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">{p.employee_name}</p>
                                                        <p className="text-[9px] font-mono text-gray-400 uppercase">Snapshot ID: #{p.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs font-bold text-slate-600">{formatCurrency(p.total_income_ves || p.total_earnings || 0)}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs font-bold text-red-500">{formatCurrency(p.total_deductions_ves || p.total_deductions || 0)}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="inline-block px-3 py-1 bg-nominix-electric/10 text-nominix-electric rounded-lg font-black text-sm">
                                                    {formatCurrency(p.net_pay_ves || p.net_pay || 0)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-[10px] font-bold text-gray-400">{p.exchange_rate_applied} Bs.</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => handleDownloadPayslip(p)}
                                                    disabled={downloadingId !== null}
                                                    className="p-2 hover:bg-nominix-electric hover:text-white rounded-xl transition-all text-nominix-electric disabled:opacity-50"
                                                    title="Descargar Recibo PDF"
                                                >
                                                    {downloadingId === p.id ? (
                                                        <Loader2 className="animate-spin" size={18} />
                                                    ) : (
                                                        <Download size={18} />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-8 bg-slate-50 border-t border-gray-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div>
                        Total Seleccionados: {filteredPayslips.length}
                    </div>
                    <div className="flex gap-4">
                        <button
                            disabled
                            className="flex items-center gap-2 text-gray-300 cursor-not-allowed"
                        >
                            <Download size={14} /> Exportar Selección
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayslipsListModal;
