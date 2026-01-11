import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Calculator, User, Users, Calendar, TrendingUp, DollarSign,
    Loader2, FileText, PlusCircle, Trash2, X, Save, AlertCircle,
    Search, ChevronDown, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const PayrollDetail = ({ period, allEmployees, initialConcepts }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);
    const [employees, setEmployees] = useState(allEmployees);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    // --- NUEVO: ESTADOS PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const searchRef = useRef(null);

    // Data State
    const [payslipData, setPayslipData] = useState(null);
    const [novelties, setNovelties] = useState([]);
    const [availableConcepts, setAvailableConcepts] = useState(initialConcepts || []);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newNovelty, setNewNovelty] = useState({ concept: '', amount: '' });
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (allEmployees) {
            setEmployees(allEmployees);
            setFilteredEmployees(allEmployees);
        } else {
            fetchEmployees();
        }

        if (initialConcepts) {
            setAvailableConcepts(initialConcepts);
        } else {
            loadConcepts();
        }

        // Click outside para cerrar el buscador
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [allEmployees, initialConcepts]);

    const fetchEmployees = async () => {
        setFetchingEmployees(true);
        try {
            const res = await axiosClient.get('/employees/?is_active=true\u0026page_size=1000');
            const list = res.data.results || res.data;
            setEmployees(list);
            setFilteredEmployees(list);
        } catch (error) {
            console.error("Error fetching employees:", error);
        } finally {
            setFetchingEmployees(false);
        }
    };

    const loadConcepts = async () => {
        try {
            const res = await axiosClient.get('/payroll-concepts/?active=true');
            setAvailableConcepts(res.data.results || res.data);
        } catch (error) {
            console.error("Error loading concepts:", error);
        }
    };


    // --- NUEVO: EFECTO DE FILTRADO ---
    useEffect(() => {
        if (!searchTerm && !isSearchOpen) return; // No filtrar si está cerrado o vacío inicialmente

        const lowerTerm = searchTerm.toLowerCase();
        const filtered = employees.filter(emp =>
            emp.first_name.toLowerCase().includes(lowerTerm) ||
            emp.last_name.toLowerCase().includes(lowerTerm) ||
            emp.national_id.includes(lowerTerm)
        );
        setFilteredEmployees(filtered);
    }, [searchTerm, employees]);


    // Main Fetcher (Novelties + Simulation)
    useEffect(() => {
        if (!selectedEmployeeId || !period) return;
        refreshData();
    }, [selectedEmployeeId, period]);

    const refreshData = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            // 1. Cargar Novedades Persistidas
            const novRes = await axiosClient.get(`/payroll-novelties/?employee=${selectedEmployeeId}&period=${period.id}`);
            setNovelties(novRes.data.results || novRes.data);

            // 2. Simular Nómina
            const simRes = await axiosClient.post(`/employees/${selectedEmployeeId}/simulate-payslip/`, {
                period_id: period.id
            });
            setPayslipData(simRes.data);

        } catch (error) {
            console.error("Error fetching detail:", error);
            setPayslipData(null);
            setErrorMsg(error.response?.data?.error || "No se pudo cargar la simulación. Verifique el contrato.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddNovelty = async (e) => {
        e.preventDefault();
        try {
            await axiosClient.post('/payroll-novelties/', {
                employee: selectedEmployeeId,
                period: period.id,
                concept_code: newNovelty.concept,
                amount: newNovelty.amount
            });
            setIsAddModalOpen(false);
            setNewNovelty({ concept: '', amount: '' });
            refreshData();
        } catch (error) {
            alert("Error agregando novedad.");
        }
    };

    const handleDeleteNovelty = async (id) => {
        if (!confirm("¿Eliminar esta novedad?")) return;
        try {
            await axiosClient.delete(`/payroll-novelties/${id}/`);
            refreshData();
        } catch (error) {
            alert("Error eliminando novedad.");
        }
    };

    // --- NUEVO: MANEJADOR DE SELECCIÓN DE EMPLEADO ---
    const handleSelectEmployee = (emp) => {
        setSelectedEmployeeId(emp.id);
        setSearchTerm(`${emp.first_name} ${emp.last_name}`);
        setIsSearchOpen(false);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(amount);
    };

    const formatUSD = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (!period) {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p className="font-bold">Seleccione un periodo abierto para gestionar el detalle.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col xl:flex-row gap-8 min-h-screen">

            {/* PANEL IZQUIERDO: Configuración */}
            <div className="xl:w-1/3 space-y-6">

                {/* --- NUEVO: SELECTOR BUSCABLE --- */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative z-20" ref={searchRef}>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <User size={12} /> Colaborador
                    </label>

                    <div className="relative">
                        {/* Input de Búsqueda */}
                        <div
                            className="flex items-center bg-gray-50 rounded-xl border border-transparent focus-within:border-nominix-electric focus-within:ring-2 focus-within:ring-nominix-electric/20 transition-all"
                            onClick={() => setIsSearchOpen(true)}
                        >
                            <Search size={16} className="ml-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full p-4 bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-700 placeholder:text-gray-400 outline-none"
                                placeholder="Buscar por nombre o cédula..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setIsSearchOpen(true);
                                }}
                                onFocus={() => setIsSearchOpen(true)}
                            />
                            <ChevronDown size={16} className="mr-4 text-gray-400" />
                        </div>

                        {/* Dropdown de Resultados */}
                        {isSearchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto custom-scrollbar z-50 animate-in fade-in slide-in-from-top-2">
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => handleSelectEmployee(emp)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0",
                                                selectedEmployeeId === emp.id ? "bg-blue-50/50" : ""
                                            )}
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">
                                                    {emp.first_name} {emp.last_name}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-mono">
                                                    {emp.national_id}
                                                </p>
                                            </div>
                                            {selectedEmployeeId === emp.id && <Check size={14} className="text-nominix-electric" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-400 text-xs">
                                        No se encontraron colaboradores
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor de Novedades */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-nominix-electric" />
                                Novedades del Periodo
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                Ajustes específicos (Horas extra, Bonos)
                            </p>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="p-2 bg-nominix-electric/10 text-nominix-electric rounded-xl hover:bg-nominix-electric hover:text-white transition-colors"
                        >
                            <PlusCircle size={18} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {novelties.length === 0 ? (
                            <div className="text-center py-8 text-gray-300 border-2 border-dashed border-gray-50 rounded-xl">
                                <p className="text-xs">Sin novedades registradas</p>
                            </div>
                        ) : (
                            novelties.map(nov => (
                                <div key={nov.id} className="group flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">{nov.concept_code}</p>
                                        <p className="text-[10px] text-gray-400">Cantidad/Monto: {nov.amount}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteNovelty(nov.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: Recibo Simulado */}
            <div className="xl:flex-1">
                {loading ? (
                    <div className="h-full min-h-[500px] flex items-center justify-center bg-white rounded-3xl">
                        <Loader2 className="animate-spin text-nominix-electric" size={48} />
                    </div>
                ) : errorMsg ? (
                    <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-red-50 p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <AlertCircle size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3">Información Requerida</h3>
                        <p className="text-gray-500 max-w-sm mx-auto leading-relaxed mb-8">
                            {errorMsg}
                        </p>

                        {errorMsg.includes("contrato") && (
                            <Link
                                to={`/personnel/${selectedEmployeeId}`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-nominix-electric text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-nominix-dark transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-nominix-electric/20"
                            >
                                <Users size={18} /> Gestionar Contrato
                            </Link>
                        )}
                    </div>
                ) : payslipData ? (
                    <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Header Recibo */}
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-start relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-nominix-electric rounded-full opacity-10 blur-3xl -mr-16 -mt-16"></div>

                            <div className="relative z-10">
                                <h2 className="text-2xl font-black italic tracking-tighter">NÓMINIX</h2>
                                <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1">Vista Previa de Nómina</p>

                                <div className="mt-6">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Colaborador</p>
                                    <p className="text-xl font-bold">{payslipData.employee}</p>
                                    <p className="text-xs opacity-60">{payslipData.position}</p>
                                </div>
                            </div>

                            <div className="relative z-10 text-right">
                                <div className="flex flex-col items-end gap-2">
                                    <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold border border-white/10 backdrop-blur-md">
                                        {period.name}
                                    </span>
                                    <div className="text-xs opacity-60 font-mono">
                                        Pago: {payslipData.payment_date}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Total Neto (VES)</p>
                                    <p className="text-3xl font-black text-nominix-electric">
                                        {formatCurrency(payslipData.totals.net_pay_ves)}
                                    </p>
                                    <p className="text-xs opacity-50 mt-1">
                                        ≈ {formatUSD(payslipData.totals.net_pay_usd_ref)} USD
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Cuerpo Recibo */}
                        <div className="p-8">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] uppercase text-gray-400 font-bold tracking-widest border-b border-gray-100">
                                        <th className="py-3 text-left">Concepto</th>
                                        <th className="py-3 text-center">Tipo</th>
                                        <th className="py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payslipData.lines.map((line, idx) => (
                                        <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="font-bold text-slate-700">{line.name}</div>
                                                <div className="text-[9px] text-gray-400 font-mono">{line.code}</div>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                    line.kind === 'EARNING' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                                )}>
                                                    {line.kind === 'EARNING' ? 'Asignación' : 'Deducción'}
                                                </span>
                                            </td>
                                            <td className={cn(
                                                "py-4 text-right font-mono font-bold",
                                                line.kind === 'EARNING' ? "text-slate-700" : "text-red-500"
                                            )}>
                                                {formatCurrency(line.amount_ves)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Totals */}
                        <div className="bg-gray-50 p-6 flex justify-between items-center text-xs font-medium text-gray-500 border-t border-gray-100">
                            <div>
                                Tasa Aplicada: Bs. {payslipData.exchange_rate_used}
                            </div>
                            <div className="flex gap-6">
                                <div>Ingresos: <span className="text-slate-900 font-bold">{formatCurrency(payslipData.totals.income_ves)}</span></div>
                                <div>Deducciones: <span className="text-red-500 font-bold">{formatCurrency(payslipData.totals.deductions_ves)}</span></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        <p>Seleccione un empleado para ver el detalle.</p>
                    </div>
                )}
            </div>

            {/* MODAL AGREGAR NOVEDAD */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-slate-800">Agregar Novedad</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleAddNovelty} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Concepto</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric text-sm font-bold text-slate-700"
                                    value={newNovelty.concept}
                                    onChange={e => setNewNovelty({ ...newNovelty, concept: e.target.value })}
                                >
                                    <option value="">Seleccione...</option>
                                    {availableConcepts.map(c => (
                                        <option key={c.id} value={c.code}>[{c.code}] {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Cantidad / Monto
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric text-sm font-bold text-slate-700"
                                    value={newNovelty.amount}
                                    onChange={e => setNewNovelty({ ...newNovelty, amount: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-nominix-electric text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-nominix-dark transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> Guardar
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PayrollDetail;