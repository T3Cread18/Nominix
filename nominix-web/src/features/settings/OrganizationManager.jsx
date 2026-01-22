import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { toast } from 'sonner';
import {
    Plus, Edit3, Trash2, Folder,
    Briefcase, Loader2, DollarSign, X
} from 'lucide-react';
import { cn } from '../../utils/cn';

// --- SUB-COMPONENTES DEPARTAMENTO (Definidos antes de uso) ---

const AddDepartmentButton = ({ onRefresh, branchId, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axiosClient.post('/departments/', {
                name,
                description,
                branch: branchId
            });
            toast.success("Departamento creado");
            setIsOpen(false);
            setName('');
            setDescription('');
            onRefresh();
        } catch (error) {
            toast.error("Error creando departamento");
        } finally {
            setSaving(false);
        }
    };

    if (isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nominix-dark/20 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
                    <h4 className="font-black text-nominix-dark mb-4">Nuevo Departamento</h4>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input className="w-full p-3 bg-gray-50 rounded-xl border text-sm font-bold outline-none focus:border-nominix-electric" placeholder="Nombre (Ej: Finanzas)" value={name} onChange={e => setName(e.target.value)} required />
                        <textarea className="w-full p-3 bg-gray-50 rounded-xl border text-sm font-medium outline-none h-20 resize-none" placeholder="Descripción breve" value={description} onChange={e => setDescription(e.target.value)} />
                        <div className="flex gap-2 justify-end pt-2">
                            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button disabled={saving} className="px-4 py-2 bg-nominix-electric text-white text-xs font-bold rounded-lg">{saving ? 'Guardando...' : 'Crear'}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="p-2 bg-nominix-electric text-white rounded-lg hover:opacity-90 transition-all shadow-lg shadow-nominix-electric/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Plus size={16} />
        </button>
    );
};

// --- SUB-COMPONENTES CARGOS (JOB POSITIONS) ---

const JobPositionModal = ({ departmentId, position, onClose, onSuccess, currencies, salarySplitMode }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        default_total_salary: '',
        currency: 'USD',
        split_fixed_amount: '0.00',
        split_fixed_currency: 'USD'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (position) {
            setFormData({
                name: position.name,
                code: position.code,
                default_total_salary: position.default_total_salary,
                currency: position.currency || 'USD',
                split_fixed_amount: position.split_fixed_amount || '0.00',
                split_fixed_currency: position.split_fixed_currency || 'USD'
            });
        }
    }, [position]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (position) {
                await axiosClient.patch(`/job-positions/${position.id}/`, {
                    ...formData,
                    department: departmentId
                });
                toast.success("Cargo actualizado");
            } else {
                await axiosClient.post('/job-positions/', {
                    ...formData,
                    department: departmentId
                });
                toast.success("Cargo creado");
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(position ? "Error actualizando" : "Error creando cargo. Verifique el código.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nominix-dark/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-black text-nominix-dark">{position ? 'Editar Cargo' : 'Nuevo Cargo'}</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 pl-2">Nombre del Cargo</label>
                        <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ej: Analista Senior" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 pl-2">Código</label>
                        <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                            value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required placeholder="Ej: CAR-01" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 pl-2">Sueldo Total</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric" type="number" step="0.01"
                                value={formData.default_total_salary} onChange={e => setFormData({ ...formData, default_total_salary: e.target.value })} required placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 pl-2">Moneda</label>
                            <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                                value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                        </div>
                    </div>

                    {salarySplitMode !== 'PERCENTAGE' && (
                        <div className="p-4 bg-nominix-electric/5 rounded-2xl border border-nominix-electric/10 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-nominix-electric pl-2 flex items-center gap-1">
                                        <DollarSign size={10} /> Monto Fijo
                                    </label>
                                    <input className="w-full p-3 bg-white rounded-xl border border-nominix-electric/20 text-sm font-bold outline-none focus:border-nominix-electric" type="number" step="0.01"
                                        value={formData.split_fixed_amount} onChange={e => setFormData({ ...formData, split_fixed_amount: e.target.value })} required placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-nominix-electric pl-2">Moneda Fijo</label>
                                    <select className="w-full p-3 bg-white rounded-xl border border-nominix-electric/20 text-sm font-bold outline-none focus:border-nominix-electric"
                                        value={formData.split_fixed_currency} onChange={e => setFormData({ ...formData, split_fixed_currency: e.target.value })}>
                                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                    </select>
                                </div>
                            </div>
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider px-2">
                                Se usa como Base Fija o Bono Fijo según la config. de empresa
                            </p>
                        </div>
                    )}

                    <button disabled={saving} className="w-full py-3 bg-nominix-electric text-white rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 mt-2">
                        {saving ? 'Guardando...' : position ? 'Guardar Cambios' : 'Crear Cargo'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const JobPositionsList = ({ department, salarySplitMode }) => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState(null);
    const [currencies, setCurrencies] = useState([]);

    useEffect(() => {
        loadPositions();
        loadCurrencies();
    }, [department]);

    const loadPositions = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/job-positions/?department=${department.id}`);
            setPositions(res.data.results || res.data);
        } catch (error) {
            toast.error("Error cargando cargos");
        } finally {
            setLoading(false);
        }
    };

    const loadCurrencies = async () => {
        try {
            const res = await axiosClient.get('/currencies/');
            setCurrencies(res.data.results || res.data);
        } catch (e) { }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-black text-nominix-dark">{department.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Briefcase size={10} /> Gestión de Cargos y Sueldos
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingPosition(null);
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-nominix-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                >
                    <Plus size={14} /> Nuevo Cargo
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" /></div>
                ) : positions.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
                        <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-xs font-black uppercase text-gray-400">No hay cargos definidos en {department.name}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {positions.map(pos => (
                            <div key={pos.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingPosition(pos);
                                            setIsModalOpen(true);
                                        }}
                                        className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-nominix-electric hover:text-white transition-colors"
                                    >
                                        <Edit3 size={12} />
                                    </button>
                                    <button className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <h5 className="font-bold text-nominix-dark">{pos.name}</h5>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-3">{pos.code}</p>

                                <div className="bg-green-50 px-3 py-2 rounded-xl inline-flex items-center gap-2 border border-green-100">
                                    <div className="bg-white p-1 rounded-full shadow-sm text-green-600"><DollarSign size={10} /></div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase text-green-600/70 leading-none">Sueldo Ref.</p>
                                        <p className="text-sm font-black text-green-700 leading-none mt-0.5">{pos.default_total_salary} {pos.currency}</p>
                                    </div>
                                    {salarySplitMode !== 'PERCENTAGE' && (
                                        <div className="border-l border-green-200 pl-2">
                                            <p className="text-[9px] font-black uppercase text-nominix-electric/70 leading-none">Monto Fijo</p>
                                            <p className="text-sm font-black text-nominix-electric leading-none mt-0.5">
                                                {pos.split_fixed_amount} {pos.split_fixed_currency}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <JobPositionModal
                    departmentId={department.id}
                    position={editingPosition}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingPosition(null);
                    }}
                    onSuccess={loadPositions}
                    currencies={currencies}
                    salarySplitMode={salarySplitMode}
                />
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

const OrganizationManager = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState(null);

    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [companyConfig, setCompanyConfig] = useState(null);

    useEffect(() => {
        loadBranches();
        loadCompanyConfig();
    }, []);

    const loadCompanyConfig = async () => {
        try {
            const res = await axiosClient.get('/company/config/');
            setCompanyConfig(res.data);
        } catch (e) {
            console.error("Error cargando config de empresa", e);
        }
    };

    useEffect(() => {
        if (selectedBranch) {
            loadDepartments(selectedBranch.id);
        } else {
            setDepartments([]);
        }
    }, [selectedBranch]);

    const loadBranches = async () => {
        try {
            const res = await axiosClient.get('/branches/');
            const branchList = res.data.results || res.data;
            setBranches(branchList);
            if (branchList.length > 0) {
                setSelectedBranch(branchList[0]);
            }
        } catch (e) {
            toast.error("Error cargando sedes");
        }
    };

    const loadDepartments = async (branchId) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/departments/?branch=${branchId}`);
            setDepartments(res.data.results || res.data);
            setSelectedDept(null);
        } catch (error) {
            toast.error("Error cargando departamentos");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* COLUMNA IZQUIERDA: DEPARTAMENTOS */}
            <div className="lg:col-span-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 space-y-4">
                    {/* Selector de Sede */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 pl-2">Sede Activa</label>
                        <select
                            className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-nominix-electric"
                            value={selectedBranch?.id || ''}
                            onChange={(e) => {
                                const b = branches.find(br => br.id == e.target.value);
                                setSelectedBranch(b);
                            }}
                        >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <h3 className="text-xs font-black uppercase text-gray-400 flex items-center gap-2">
                            <Folder size={14} /> Departamentos
                        </h3>
                        <AddDepartmentButton
                            branchId={selectedBranch?.id}
                            onRefresh={() => loadDepartments(selectedBranch?.id)}
                            disabled={!selectedBranch}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" /></div>
                    ) : departments.length === 0 ? (
                        <div className="text-center py-10 text-gray-300 text-xs font-bold uppercase">Sin departamentos</div>
                    ) : (
                        departments.map(dept => (
                            <div
                                key={dept.id}
                                onClick={() => setSelectedDept(dept)}
                                className={cn(
                                    "p-4 rounded-xl border cursor-pointer transition-all group flex items-center justify-between",
                                    selectedDept?.id === dept.id
                                        ? "bg-nominix-electric text-white border-nominix-electric shadow-lg shadow-nominix-electric/20"
                                        : "bg-white border-gray-100 hover:border-nominix-electric/30 hover:shadow-md"
                                )}
                            >
                                <div>
                                    <h4 className="font-bold text-sm">{dept.name}</h4>
                                    <p className={cn("text-[10px] uppercase font-bold mt-1", selectedDept?.id === dept.id ? "text-white/70" : "text-gray-400")}>
                                        {dept.description || 'Sin descripción'}
                                    </p>
                                </div>
                                <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex gap-1", selectedDept?.id === dept.id && "opacity-100")}>
                                    {/* Botones de acción dept se podrían poner aquí */}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA: CARGOS (JOB POSITIONS) */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                {selectedDept ? (
                    <JobPositionsList
                        department={selectedDept}
                        salarySplitMode={companyConfig?.salary_split_mode}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <Folder size={64} className="mb-4 opacity-20" />
                        <p className="text-sm font-black uppercase tracking-widest">Seleccione un departamento</p>
                        <p className="text-xs mt-2">Para gestionar sus cargos asociados</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizationManager;
