
import React from 'react';
import { UserPlus, Search, Building2, X } from 'lucide-react';

const HeaderToolbar = ({
    searchTerm,
    setSearchTerm,
    selectedBranch,
    setSelectedBranch,
    branches,
    onNewClick
}) => {
    return (
        <div className="p-6 border-b border-gray-50 bg-white/50 backdrop-blur-sm z-20">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Personal</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Gestión de Talento Humano
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">

                    {/* SELECTOR DE SEDE */}
                    <div className="relative group w-full sm:w-48">
                        <select
                            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 focus:outline-none font-bold text-xs transition-all text-slate-600 appearance-none cursor-pointer"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="">Todas las Sedes</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* BUSCADOR */}
                    <div className="relative group w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, cédula..."
                            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 focus:outline-none font-bold text-xs transition-all text-slate-600 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-nominix-electric" size={16} />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* BOTÓN NUEVO */}
                    <button
                        onClick={onNewClick}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-nominix-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95 whitespace-nowrap"
                    >
                        <UserPlus size={16} /> <span className="hidden sm:inline">Nuevo</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeaderToolbar;
