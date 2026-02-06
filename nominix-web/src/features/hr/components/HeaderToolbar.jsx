
import React from 'react';
import { UserPlus, Search, Building2, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';

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
                    <div className="w-full sm:w-48">
                        <SelectField
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            options={[
                                { value: '', label: 'Todas las Sedes' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            icon={Building2}
                            placeholder="Filtrar Sede"
                        />
                    </div>

                    {/* BUSCADOR */}
                    <div className="w-full sm:w-64 relative">
                        <InputField
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                            icon={Search}
                        />
                    </div>

                    {/* BOTÓN NUEVO */}
                    <Button
                        onClick={onNewClick}
                        icon={UserPlus}
                        className="w-full sm:w-auto shadow-xl shadow-slate-200"
                    >
                        <span className="hidden sm:inline">Nuevo</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default HeaderToolbar;

