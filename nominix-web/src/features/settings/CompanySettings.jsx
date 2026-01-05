import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { toast } from 'sonner';
import {
    Building2, MapPin, Globe, Save, Loader2,
    Upload, Camera, Mail, Phone, Hash, Store,
    Plus, Edit3, Trash2, X, CheckCircle2, XCircle,
    DollarSign, Clock
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const CompanySettings = () => {
    const [activeTab, setActiveTab] = useState('company'); // 'company' | 'branches'

    return (
        <div className="max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-nominix-dark tracking-tight">Configuración</h1>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-2">
                    Gestión de identidad corporativa y sucursales
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-6 border-b border-gray-100 mb-8 sticky top-0 bg-gray-100/95 backdrop-blur z-10 pt-2">
                <button
                    onClick={() => setActiveTab('company')}
                    className={cn(
                        "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
                        activeTab === 'company' ? "border-nominix-electric text-nominix-electric" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Building2 size={16} /> Datos Empresa
                </button>
                <button
                    onClick={() => setActiveTab('branches')}
                    className={cn(
                        "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
                        activeTab === 'branches' ? "border-nominix-electric text-nominix-electric" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Store size={16} /> Sedes / Sucursales
                </button>
            </div>

            {/* Content Switcher */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'company' ? <CompanyForm /> : <BranchManager />}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTE 1: FORMULARIO DE EMPRESA (El que ya teníamos) ---
const CompanyForm = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [company, setCompany] = useState({
        name: '', rif: '', email: '', phone: '',
        website: '', address: '', city: '', state: '',
        base_currency_symbol: 'Bs.',
        national_minimum_salary: 130.00,
        payroll_journey: 'BIWEEKLY',
        cestaticket_journey: 'MONTHLY',
        cestaticket_payment_day: 30
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await axiosClient.get('/company/config/');
                setCompany(res.data);
            } catch (error) { toast.error("Error cargando datos"); }
            finally { setLoading(false); }
        };
        loadData();
    }, []);

    const handleChange = (e) => setCompany({ ...company, [e.target.name]: e.target.value });

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axiosClient.put('/company/config/', company);
            setCompany(res.data);
            toast.success('Datos actualizados');
        } catch (error) {
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>;

    return (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda: Logo y Resumen */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-gray-50 to-white z-0" />
                    <div className="relative z-10 w-32 h-32 rounded-full bg-white border-4 border-gray-50 shadow-xl flex items-center justify-center mb-4 group cursor-pointer overflow-hidden">
                        <Building2 size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-black text-nominix-dark relative z-10">{company.name || 'Sin Nombre'}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 relative z-10">{company.rif || 'J-...'}</p>
                </div>
            </div>

            {/* Columna Derecha: Campos */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2"><Building2 size={14} /> Identidad Fiscal & Parametrización</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <InputField label="Razón Social" name="name" value={company.name} onChange={handleChange} />
                        <InputField label="RIF" name="rif" value={company.rif} onChange={handleChange} />
                        <div className="md:col-span-2 lg:col-span-1 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                            <InputField
                                label="Salario Mínimo Nacional (Bs.)"
                                name="national_minimum_salary"
                                type="number"
                                step="0.01"
                                value={company.national_minimum_salary}
                                onChange={handleChange}
                            />
                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mt-2 px-3">
                                <DollarSign size={10} className="inline mr-1" /> Base para topes de IVSS y RPE
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2"><Clock size={14} /> Frecuencias de Pago</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 pl-3">Frecuencia Nómina Salarial</label>
                            <select
                                name="payroll_journey"
                                value={company.payroll_journey}
                                onChange={handleChange}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:bg-white focus:border-nominix-electric outline-none appearance-none"
                            >
                                <option value="WEEKLY">Semanal</option>
                                <option value="BIWEEKLY">Quincenal</option>
                                <option value="MONTHLY">Mensual</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 pl-3">Frecuencia Cestaticket</label>
                            <select
                                name="cestaticket_journey"
                                value={company.cestaticket_journey}
                                onChange={handleChange}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:bg-white focus:border-nominix-electric outline-none appearance-none"
                            >
                                <option value="MONTHLY">Mensual (Fecha única)</option>
                                <option value="PERIODIC">Proporcional cada pago</option>
                            </select>
                        </div>
                        {company.cestaticket_journey === 'MONTHLY' && (
                            <InputField
                                label="Día de Pago Cestaticket"
                                name="cestaticket_payment_day"
                                type="number"
                                value={company.cestaticket_payment_day}
                                onChange={handleChange}
                                placeholder="Ej: 30"
                            />
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2"><MapPin size={14} /> Ubicación & Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-[9px] font-black uppercase text-gray-400 pl-3 mb-1 block">Dirección Fiscal</label>
                            <textarea name="address" value={company.address || ''} onChange={handleChange} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none resize-none h-24" />
                        </div>
                        <InputField label="Teléfono" name="phone" value={company.phone} onChange={handleChange} />
                        <InputField label="Email" name="email" value={company.email} onChange={handleChange} />
                        <InputField label="Ciudad" name="city" value={company.city} onChange={handleChange} />
                        <InputField label="Estado" name="state" value={company.state} onChange={handleChange} />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button disabled={saving} className="px-8 py-4 bg-nominix-dark text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center gap-2">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar Cambios
                    </button>
                </div>
            </div>
        </form>
    );
};

// --- SUB-COMPONENTE 2: GESTOR DE SEDES (Nuevo) ---
const BranchManager = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null); // null = creando, obj = editando

    useEffect(() => { fetchBranches(); }, []);

    const fetchBranches = async () => {
        try {
            const res = await axiosClient.get('/branches/');
            setBranches(res.data.results || res.data);
        } catch (error) { toast.error("Error cargando sedes"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar sede? Si tiene empleados asociados no se podrá eliminar.")) return;
        try {
            await axiosClient.delete(`/branches/${id}/`);
            toast.success("Sede eliminada");
            fetchBranches();
        } catch (error) { toast.error("No se pudo eliminar (Posiblemente tiene empleados activos)"); }
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingBranch(null);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        fetchBranches();
    };

    if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button onClick={handleCreate} className="px-6 py-3 bg-nominix-electric text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 flex items-center gap-2 shadow-lg shadow-nominix-electric/20">
                    <Plus size={16} /> Nueva Sede
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                    <div key={branch.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => handleEdit(branch)} className="p-2 bg-gray-50 text-nominix-dark rounded-lg hover:bg-nominix-electric hover:text-white transition-colors"><Edit3 size={14} /></button>
                            <button onClick={() => handleDelete(branch.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14} /></button>
                        </div>

                        <div className="mb-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4 group-hover:bg-nominix-electric group-hover:text-white transition-colors">
                                <Store size={24} />
                            </div>
                            <h4 className="text-lg font-black text-nominix-dark">{branch.name}</h4>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mt-1">{branch.code}</p>
                        </div>

                        <div className="space-y-2 border-t border-gray-50 pt-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <Hash size={12} className="text-gray-300" /> {branch.rif || 'Sin RIF'}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <Phone size={12} className="text-gray-300" /> {branch.phone || 'Sin Tlf'}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <MapPin size={12} className="text-gray-300" /> <span className="truncate">{branch.address || 'Sin Dirección'}</span>
                            </div>
                        </div>

                        <div className="absolute bottom-6 right-6">
                            {branch.is_active
                                ? <CheckCircle2 size={16} className="text-green-500" />
                                : <XCircle size={16} className="text-red-500" />
                            }
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {branches.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-[2rem]">
                        <Store size={40} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-xs font-black uppercase text-gray-400">No hay sedes registradas</p>
                    </div>
                )}
            </div>

            {/* Modal de Crear/Editar Sede */}
            {isModalOpen && (
                <BranchFormModal
                    branch={editingBranch}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
};

// --- SUB-COMPONENTE 3: MODAL DE SEDE ---
const BranchFormModal = ({ branch, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '', code: '', rif: '', phone: '', address: '', is_active: true
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (branch) setFormData(branch);
    }, [branch]);

    const handleChange = (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: val });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (branch) {
                await axiosClient.put(`/branches/${branch.id}/`, formData);
                toast.success("Sede actualizada");
            } else {
                await axiosClient.post('/branches/', formData);
                toast.success("Sede creada");
            }
            onSuccess();
        } catch (error) {
            toast.error("Error al guardar. Revise el código (debe ser único).");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nominix-dark/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-nominix-dark">{branch ? 'Editar Sede' : 'Nueva Sede'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full"><X size={20} className="text-gray-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <InputField label="Nombre" name="name" value={formData.name} onChange={handleChange} required placeholder="Ej: Sucursal Centro" />
                        <InputField label="Código" name="code" value={formData.code} onChange={handleChange} required placeholder="Ej: S-001" />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <InputField label="RIF" name="rif" value={formData.rif} onChange={handleChange} placeholder="J-12345678-9" />
                        <InputField label="Teléfono" name="phone" value={formData.phone} onChange={handleChange} placeholder="0212..." />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-gray-400 pl-3 mb-1 block">Dirección Física</label>
                        <textarea name="address" value={formData.address || ''} onChange={handleChange} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none h-20 resize-none" />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                        <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-5 h-5 text-nominix-electric rounded focus:ring-0" />
                        <label className="text-xs font-bold text-gray-600 uppercase">Sede Operativa</label>
                    </div>

                    <button disabled={saving} className="w-full py-4 bg-nominix-dark text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">
                        {saving ? <Loader2 className="animate-spin mx-auto" /> : (branch ? 'Guardar Cambios' : 'Crear Sede')}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Componente Helper Input
const InputField = ({ label, name, value, onChange, required, placeholder, type = "text", step }) => (
    <div className="space-y-1">
        <label className="text-[9px] font-black uppercase text-gray-400 pl-3">{label} {required && '*'}</label>
        <input
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:bg-white focus:border-nominix-electric outline-none transition-all placeholder:text-gray-300 placeholder:font-normal"
            name={name}
            value={value || ''}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            type={type}
            step={step}
        />
    </div>
);

export default CompanySettings;