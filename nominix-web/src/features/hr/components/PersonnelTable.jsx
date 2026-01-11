
import React from 'react';
import {
    Filter, Loader2, CheckCircle2, XCircle, Trash2, Edit3,
    Hash, Building2
} from 'lucide-react';
import { cn } from '../../../utils/cn';

// Helper local para fotos
const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${window.location.origin}${path}`;
};

const PersonnelTable = ({
    employees,
    loading,
    searchTerm,
    selectedBranch,
    deletingId,
    onRowClick,
    onRequestDelete
}) => {

    // Loading State
    if (loading && employees.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-300">
                <Loader2 className="animate-spin mb-4 text-nominix-electric" size={40} />
                <p className="font-black uppercase text-[10px] tracking-[0.3em]">Buscando...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30">
            <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-white/80 backdrop-blur-md shadow-sm">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Colaborador</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden md:table-cell">Cargo & Área</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden lg:table-cell">Ubicación</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                    {employees.length > 0 ? employees.map((emp) => (
                        <tr
                            key={emp.id}
                            onClick={() => onRowClick(emp.id)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100 flex-shrink-0">
                                            {emp.photo ? (
                                                <img
                                                    src={getPhotoUrl(emp.photo)}
                                                    alt={emp.first_name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <span
                                                className="w-full h-full flex items-center justify-center font-black text-xs text-slate-500 uppercase"
                                                style={{ display: emp.photo ? 'none' : 'flex' }}
                                            >
                                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                                            emp.is_active ? "bg-green-500 shadow-sm" : "bg-slate-300"
                                        )} />
                                    </div>

                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-800 text-sm group-hover:text-nominix-electric transition-colors">
                                            {emp.first_name} {emp.last_name}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                                            <Hash size={10} /> {emp.national_id}
                                        </p>
                                    </div>
                                </div>
                            </td>

                            <td className="px-6 py-4 hidden md:table-cell">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-700">{emp.position || 'Sin Cargo'}</p>
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                                        {emp.department?.name || 'General'}
                                    </span>
                                </div>
                            </td>

                            <td className="px-6 py-4 hidden lg:table-cell">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Building2 size={14} className="text-slate-300" />
                                    <span className="text-xs font-bold">{emp.branch?.name || 'Sede Principal'}</span>
                                </div>
                            </td>

                            <td className="px-6 py-4">
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border",
                                    emp.is_active
                                        ? "bg-green-50 text-green-600 border-green-100"
                                        : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {emp.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    {emp.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-nominix-electric border border-transparent hover:border-slate-100 shadow-sm transition-all">
                                        <Edit3 size={16} />
                                    </button>

                                    <button
                                        onClick={(e) => onRequestDelete(e, emp.id)}
                                        disabled={deletingId === emp.id}
                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100 transition-all"
                                    >
                                        {deletingId === emp.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="5" className="px-8 py-24 text-center">
                                <div className="flex flex-col items-center justify-center opacity-50">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Filter size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
                                        {searchTerm || selectedBranch ? 'No hay coincidencias' : 'Sin datos'}
                                    </p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PersonnelTable;
