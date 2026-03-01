import React, { useState } from 'react';
import { X, User, DollarSign, TrendingUp, Info, ChevronDown, ChevronUp, ReceiptText } from 'lucide-react';

/**
 * PayrollPreviewModal - Muestra los cálculos proyectados de la nómina.
 */
const PayrollPreviewModal = ({ isOpen, onClose, data, companyConfig }) => {
    const [expandedId, setExpandedId] = useState(null);

    if (!isOpen || !data) return null;

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="fixed inset-0 bg-nominix-dark/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] flex flex-col relative shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-nominix-dark tracking-tight">Previsualización de Nómina</h3>
                        <p className="text-sm text-gray-400 font-medium">
                            Resultados proyectados para <span className="text-nominix-electric font-bold">{data.period_name}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-nominix-dark"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 bg-gray-50/50">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2 text-nominix-electric">
                            <User size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Empleados</span>
                        </div>
                        <p className="text-2xl font-black text-nominix-dark">{data.results?.length || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2 text-green-500">
                            <DollarSign size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Neto (VES)</span>
                        </div>
                        <p className="text-2xl font-black text-nominix-dark">
                            {data.total_net_ves?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2 text-amber-500">
                            <TrendingUp size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tasa de Cambio</span>
                        </div>
                        <p className="text-2xl font-black text-nominix-dark">{data.exchange_rate} Bs.</p>
                    </div>
                </div>

                {/* Info Alert */}
                <div className="px-8 mt-4">
                    <div className="flex items-center gap-3 bg-blue-50/50 text-blue-600 p-4 rounded-2xl border border-blue-100/50">
                        <Info size={16} className="shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                            Esta es una proyección informativa. Haz clic en un empleado para ver su recibo detallado.
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="overflow-hidden border border-gray-100 rounded-3xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-10"></th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Empleado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Asignaciones</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Deducciones</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Neto (VES)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right text-nominix-electric">Neto (USD Ref)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.results?.map((res) => {
                                    const isExpanded = expandedId === res.employee_id;
                                    return (
                                        <React.Fragment key={res.employee_id}>
                                            <tr
                                                onClick={() => toggleExpand(res.employee_id)}
                                                className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-nominix-electric/5' : 'hover:bg-gray-50/30'}`}
                                            >
                                                <td className="px-6 py-4 text-center">
                                                    {isExpanded ? <ChevronUp size={16} className="text-nominix-electric" /> : <ChevronDown size={16} className="text-gray-300 group-hover:text-nominix-electric" />}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-nominix-dark text-sm">{res.full_name}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">{res.national_id}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {res.income_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-medium text-red-400">
                                                        {res.deductions_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-black text-nominix-dark">
                                                        {res.net_pay_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-black text-nominix-electric">
                                                        ${res.net_pay_usd_ref.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="6" className="px-8 py-6 bg-gray-50/30">
                                                        <div className="bg-white rounded-3xl border border-nominix-electric/10 shadow-xl p-8 max-w-3xl mx-auto animate-in slide-in-from-top-4 duration-300">
                                                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                                                <ReceiptText className="text-nominix-electric" size={20} />
                                                                <h4 className="font-black text-xs uppercase tracking-widest text-nominix-dark">Desglose de Conceptos</h4>
                                                            </div>

                                                            <div className="space-y-3">
                                                                {res.lines?.filter(line => {
                                                                    // Filtro de Visibilidad según Configuración de Empresa
                                                                    if (line.code === 'CESTATICKET' && companyConfig?.show_tickets === false) return false;
                                                                    if (line.code === 'COMPLEMENTO' && companyConfig?.show_supplement === false) return false;
                                                                    if (line.code === 'SUELDO_BASE' && companyConfig?.show_base_salary === false) return false;
                                                                    return true;
                                                                }).map((line, idx) => (
                                                                    <div key={line.code} className="flex justify-between items-center py-2 group/line">
                                                                        <div>
                                                                            <p className="text-[11px] font-bold text-nominix-dark uppercase tracking-wider">{line.name}</p>
                                                                            <div className="flex items-center gap-2">
                                                                                {line.quantity > 0 && (
                                                                                    <p className="text-[9px] text-gray-400 font-medium">{line.quantity} {line.unit}</p>
                                                                                )}
                                                                                {line.trace && (
                                                                                    <p className="text-[9px] text-amber-500 font-black tracking-tight bg-amber-50 px-1.5 rounded">
                                                                                        {line.trace}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-10">
                                                                            <span className={`text-xs font-black ${line.kind === 'EARNING' ? 'text-green-600' : 'text-red-500'}`}>
                                                                                {line.kind === 'DEDUCTION' ? '-' : ''}
                                                                                {Number(line.amount_ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total a Percibir</span>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-black text-nominix-dark">
                                                                        {res.net_pay_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })} <span className="text-[10px] text-gray-400">VES</span>
                                                                    </p>
                                                                    <p className="text-xs font-bold text-nominix-electric">
                                                                        REF: ${res.net_pay_usd_ref.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-nominix-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-nominix-electric transition-all shadow-xl active:scale-95"
                    >
                        Cerrar Previsualización
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayrollPreviewModal;
