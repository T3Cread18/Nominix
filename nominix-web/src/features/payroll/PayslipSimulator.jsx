import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Calculator,
    User,
    Calendar,
    TrendingUp,
    DollarSign,
    Clock,
    Moon,
    ChevronRight,
    Loader2,
    FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes
 */
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const PayslipSimulator = () => {
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [data, setData] = useState(null);
    const [inputs, setInputs] = useState({
        overtime_hours: 0,
        night_hours: 0
    });

    // Cargar empleados al montar el componente
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await axiosClient.get('/employees/');
                // DRF devuelve resultados en data.results si hay paginación activa
                const employeesList = response.data.results || response.data;
                setEmployees(Array.isArray(employeesList) ? employeesList : []);

                if (Array.isArray(employeesList) && employeesList.length > 0) {
                    setSelectedEmployeeId(employeesList[0].id);
                }
            } catch (error) {
                console.error("Error al cargar empleados:", error);
                setEmployees([]);
            } finally {
                setFetchingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    const handleRecalculate = async () => {
        if (!selectedEmployeeId) return;
        setLoading(true);
        try {
            const response = await axiosClient.post(`/employees/${selectedEmployeeId}/simulate-payslip/`, {
                overtime_hours: parseFloat(inputs.overtime_hours) || 0,
                night_hours: parseFloat(inputs.night_hours) || 0
            });
            setData(response.data);
        } catch (error) {
            console.error("Error en simulación:", error);
            alert("No se pudo calcular la nómina. Revisa el contrato del empleado.");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'VES',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatUSD = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto p-4 lg:p-10 font-sans antialiased text-nominix-dark bg-nominix-smoke min-h-screen">

            {/* PANEL IZQUIERDO: Control */}
            <div className="flex-1 bg-nominix-surface p-8 rounded-3xl shadow-sm border border-gray-100 h-fit space-y-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-nominix-electric/10 rounded-2xl text-nominix-electric">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Simulación</h2>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Variables del Periodo</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Selector de Empleado */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <User size={12} /> Seleccionar Colaborador
                        </label>
                        {fetchingEmployees ? (
                            <div className="h-14 bg-gray-50 animate-pulse rounded-xl"></div>
                        ) : (
                            <select
                                className="p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-nominix-electric focus:ring-0 focus:outline-none text-sm font-bold transition-all appearance-none cursor-pointer"
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            >
                                <option value="">Selecciona un empleado...</option>
                                {Array.isArray(employees) && employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.full_name} ({emp.national_id})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={12} /> Horas Extra (50% Recargo)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-nominix-electric focus:ring-0 focus:outline-none text-2xl font-bold transition-all"
                                value={inputs.overtime_hours}
                                onChange={(e) => setInputs({ ...inputs, overtime_hours: e.target.value })}
                                placeholder="0"
                            />
                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Moon size={12} /> Bono Nocturno (30% Recargo)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-nominix-electric focus:ring-0 focus:outline-none text-2xl font-bold transition-all"
                                value={inputs.night_hours}
                                onChange={(e) => setInputs({ ...inputs, night_hours: e.target.value })}
                                placeholder="0"
                            />
                            <Moon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        </div>
                    </div>

                    <button
                        onClick={handleRecalculate}
                        disabled={loading || !selectedEmployeeId}
                        className={cn(
                            "w-full bg-nominix-electric text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-nominix-electric/20",
                            "hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale",
                            "flex items-center justify-center gap-2"
                        )}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <ChevronRight size={20} />}
                        {loading ? 'Calculando...' : 'Recalcular Nómina'}
                    </button>
                </div>
            </div>

            {/* PANEL DERECHO: Recibo */}
            <div className="flex-[1.5]">
                {data ? (
                    <div className="bg-nominix-surface rounded-sm shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700 relative border-t-8 border-nominix-dark">
                        {/* Decoración superior */}
                        <div className="absolute top-0 left-0 w-full flex justify-around opacity-10">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="w-4 h-4 rounded-full bg-white -mt-2"></div>
                            ))}
                        </div>

                        {/* Cabecera Recibo */}
                        <div className="p-10 border-b-2 border-dashed border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <FileText className="text-nominix-electric" size={32} />
                                        <h1 className="text-3xl font-black text-nominix-dark tracking-tighter italic">NÓMINIX</h1>
                                    </div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black mt-2">Recibo de Simulación Oficial</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-nominix-smoke px-3 py-1 rounded-lg text-[10px] font-black text-nominix-dark border border-gray-200 uppercase flex items-center gap-2">
                                        <TrendingUp size={12} className="text-green-500" />
                                        Tasa BCV: {data.exchange_rate_used} Bs/$
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-bold flex items-center gap-1 uppercase">
                                        <Calendar size={10} /> {data.payment_date}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 text-sm">
                                <div>
                                    <p className="text-gray-400 uppercase font-black text-[9px] tracking-widest mb-1">Colaborador</p>
                                    <p className="font-extrabold text-xl text-nominix-dark">{data.employee}</p>
                                    <p className="text-xs text-gray-500 font-medium">{data.position || 'Contrato Activo'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 uppercase font-black text-[9px] tracking-widest mb-1">Concepto del Pago</p>
                                    <p className="font-bold text-gray-700">Nómina Ordinaria</p>
                                    <p className="text-xs text-gray-500 font-medium italic">Mensual / {data.contract_currency}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabla de Conceptos */}
                        <div className="px-10 py-8 min-h-[350px]">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] uppercase text-gray-400 font-black tracking-widest border-b border-gray-100">
                                        <th className="py-4">Descripción de Concepto</th>
                                        <th className="py-4 text-center">Clasificación</th>
                                        <th className="py-4 text-right">Importe Neto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-medium">
                                    {data.lines.map((line, idx) => (
                                        <tr key={idx} className="group hover:bg-nominix-smoke/30 transition-all">
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 font-bold">{line.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Cód: {line.code}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 text-center">
                                                <span className={cn(
                                                    "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter",
                                                    line.kind === 'EARNING' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {line.kind}
                                                </span>
                                            </td>
                                            <td className={cn(
                                                "py-5 text-right font-mono font-black text-base",
                                                line.kind === 'EARNING' ? "text-gray-800" : "text-red-500"
                                            )}>
                                                {line.kind === 'DEDUCTION' && '-'}{line.amount_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Recibo */}
                        <div className="bg-nominix-dark p-12 text-white relative overflow-hidden">
                            {/* Gráfico decorativo de fondo */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-nominix-electric/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>

                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <p className="text-[10px] uppercase font-black opacity-40 mb-2 tracking-[0.2em]">Total Neto a Percibir</p>
                                    <div className="flex flex-col">
                                        <h3 className="text-6xl font-black tracking-tighter">{formatCurrency(data.totals.net_pay_ves)}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest italic">Cálculo Certificado LOTTT / IVSS</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                                        <DollarSign size={16} className="text-nominix-electric" />
                                        <span className="text-lg font-black">{formatUSD(data.totals.net_pay_usd_ref)}</span>
                                    </div>
                                    <div className="opacity-30">
                                        <p className="text-[9px] font-black tracking-[0.3em] uppercase">Nóminix Vzla Core 1.0</p>
                                        <p className="text-[8px] font-medium italic">Powered by Advanced Payroll Engine</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[600px] bg-white/50 border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-300 p-10 text-center">
                        <div className="p-8 bg-white rounded-full shadow-lg mb-6 border border-gray-100">
                            <FileText size={64} className="opacity-20 translate-x-1" />
                        </div>
                        <h3 className="font-black text-2xl text-gray-400 mb-2 uppercase tracking-tighter">Vista Previa de Recibo</h3>
                        <p className="text-sm font-medium max-w-[280px]">Configura las horas extra y selecciona un empleado para visualizar el impacto en la nómina.</p>

                        <div className="mt-8 flex gap-4 opacity-30">
                            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                            <div className="w-4 h-1 bg-gray-300 rounded-full"></div>
                            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default PayslipSimulator;
