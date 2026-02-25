
import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Plus, Search, Banknote, Calendar, TrendingUp, AlertCircle, CheckCircle2,
    XCircle, Clock, PieChart, Download
} from 'lucide-react';
import { cn } from '../../utils/cn';
import LoanFormModal from './LoanFormModal';
import RequirePermission from '../../context/RequirePermission';

const LoanManager = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLoans = useCallback(async () => {
        setLoading(true);
        try {
            const url = searchTerm
                ? `/loans/?search=${searchTerm}`
                : '/loans/';
            const res = await axiosClient.get(url);
            setLoans(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching loans", error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLoans();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchLoans]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-50 text-green-600 border-green-100';
            case 'PAID': return 'bg-slate-100 text-slate-500 border-slate-200';
            case 'DRAFT': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-500';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ACTIVE': return <TrendingUp size={14} />;
            case 'PAID': return <CheckCircle2 size={14} />;
            case 'DRAFT': return <Clock size={14} />;
            case 'CANCELLED': return <XCircle size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">

            <LoanFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchLoans}
            />

            {/* Header */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Préstamos</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Cuentas por cobrar empleados
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar empleado..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 focus:outline-none font-bold text-xs transition-all text-slate-600 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-nominix-electric" size={16} />
                    </div>

                    <div className="flex flex-row gap-2 w-full lg:w-auto mt-4 lg:mt-0">
                        <RequirePermission permission="payroll_core.add_loan">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-nominix-dark hover:bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-nominix-dark/10 active:scale-95"
                            >
                                <Plus size={16} /> Solicitar Préstamo
                            </button>
                        </RequirePermission>
                        <button className="flex-none flex items-center justify-center p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors">
                            <Download size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-10"><Clock className="animate-spin text-nominix-electric" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
                        {loans.map(loan => (
                            <div key={loan.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-slate-100 w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 font-black text-sm uppercase">
                                        {loan.employee_data?.first_name?.[0]}{loan.employee_data?.last_name?.[0]}
                                    </div>
                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1.5", getStatusColor(loan.status))}>
                                        {getStatusIcon(loan.status)} {loan.status}
                                    </span>
                                </div>

                                {loan.status === 'DRAFT' && ( // Assuming 'DRAFT' is the status that needs approval/rejection
                                    <RequirePermission permission="payroll_core.change_loan">
                                        <div className="flex gap-2 mb-4"> {/* Added mb-4 for spacing */}
                                            <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors">
                                                <CheckCircle2 size={16} /> Autorizar
                                            </button>
                                            <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors">
                                                <XCircle size={16} /> Rechazar
                                            </button>
                                        </div>
                                    </RequirePermission>
                                )}

                                <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-nominix-electric transition-colors truncate">
                                    {loan.employee_data?.first_name} {loan.employee_data?.last_name}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-1">
                                    <Clock size={12} /> {loan.description}
                                </p>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Deuda Total</span>
                                        <span className="font-black text-slate-700">{loan.currency} {parseFloat(loan.amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Saldo Restante</span>
                                        <span className="font-black text-red-500">{loan.currency} {parseFloat(loan.balance).toLocaleString()}</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-nominix-electric h-full rounded-full transition-all duration-500"
                                            style={{ width: `${100 - (loan.balance / (loan.amount * (1 + loan.interest_rate / 100)) * 100)}%` }}
                                        />
                                    </div>

                                    <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuota</span>
                                            <span className="font-bold text-slate-700 text-xs">{loan.currency} {parseFloat(loan.installment_amount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interés</span>
                                            <span className="font-bold text-slate-700 text-xs">{loan.interest_rate}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loans.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-300">
                                <PieChart size={48} className="mb-4 opacity-50" />
                                <p className="font-black uppercase tracking-widest text-sm">No hay préstamos registrados</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoanManager;
