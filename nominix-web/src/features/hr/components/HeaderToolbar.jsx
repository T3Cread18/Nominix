import React from 'react';
import { Search, Plus, Filter, Building2, Shirt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, Button, SelectField } from '../../../components/ui';
import RequirePermission from '../../../context/RequirePermission';

const HeaderToolbar = ({
    searchTerm,
    setSearchTerm,
    selectedBranch,
    setSelectedBranch,
    branches,
    onEndowmentsClick
}) => {
    const navigate = useNavigate();

    return (
        <div className="p-4 sm:p-6 border-b border-gray-50 bg-white/50 backdrop-blur-sm z-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Personal</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Gestión de Talento Humano
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">

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

                    {/* BOTÓN DOTACIONES */}
                    <RequirePermission permission="payroll_core.view_endowmentevent">
                        <Button
                            onClick={onEndowmentsClick}
                            icon={Shirt}
                            variant="secondary"
                            className="w-full sm:w-auto"
                        >
                            <span className="hidden sm:inline">Dotaciones</span>
                        </Button>
                    </RequirePermission>

                    {/* BOTONES ACCION (NUEVO, FILTRAR) */}
                    <div className="flex flex-row gap-2 w-full md:w-auto">
                        <RequirePermission permission="payroll_core.add_employee">
                            <Button
                                onClick={() => navigate('/personnel/create')}
                                className="flex-1 md:flex-none justify-center py-2.5 px-4"
                                icon={Plus}
                            >
                                <span className="hidden sm:inline">Nuevo Empleado</span>
                                <span className="sm:hidden">Nuevo</span>
                            </Button>
                        </RequirePermission>
                        <Button
                            variant="secondary"
                            className="flex-none px-3 py-2.5"
                            icon={Filter}
                            title="Filtrar"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeaderToolbar;

