
import React from 'react';
import { UserPlus, Search, Building2, X, ChevronDown } from 'lucide-react';

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
                            className="w-full pl-10 pr-10 p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-xs text-nominix-dark appearance-none cursor-pointer focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none transition-all duration-300"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="">Todas las Sedes</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronDown size={14} strokeWidth={3} />
                        </div>
                    </div>

                    {/* BUSCADOR */}
                    <div className="relative group w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, cédula..."
                            className="w-full pl-10 pr-10 p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-xs text-nominix-dark placeholder:text-gray-300 focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none transition-all duration-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-nominix-electric transition-colors" size={16} />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* BOTÓN NUEVO */}
                    <button
                        onClick={onNewClick}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-nominix-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 whitespace-nowrap"
                    >
                        <UserPlus size={16} /> <span className="hidden sm:inline">Nuevo</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeaderToolbar;
