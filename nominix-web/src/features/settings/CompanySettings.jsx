import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../../api/axiosClient';
import { toast } from 'sonner';
import {
    Building2, MapPin, Globe, Save, Loader2,
    Upload, Camera, Mail, Phone, Hash, Store,
    Plus, Edit3, Trash2, X, CheckCircle2, XCircle,
    DollarSign, Clock, Calculator, Percent
} from 'lucide-react';
import { cn } from '../../utils/cn';
// Asegúrate de que este componente exista en tu proyecto o coméntalo si aún no lo tienes
import OrganizationManager from './OrganizationManager';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import ToggleField from '../../components/ui/ToggleField';

const CompanySettings = () => {
    const [activeTab, setActiveTab] = useState('company');

    // Estados de datos
    const [company, setCompany] = useState(null);
    const [branches, setBranches] = useState([]);
    const [policies, setPolicies] = useState(null); // Nuevo estado para políticas

    const [loading, setLoading] = useState(true);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (!hasLoaded.current) {
            loadData();
            hasLoaded.current = true;
        }
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Ahora cargamos 3 endpoints en paralelo
            const [companyRes, branchesRes, policiesRes] = await Promise.all([
                axiosClient.get('/company/config/'),
                axiosClient.get('/branches/'),
                axiosClient.get('/company/policies/') // Endpoint nuevo del backend
            ]);

            setCompany(companyRes.data);
            setBranches(branchesRes.data.results || branchesRes.data);
            setPolicies(policiesRes.data);

        } catch (error) {
            console.error(error);
            toast.error("Error cargando configuración");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-nominix-dark tracking-tight">Configuración</h1>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-2">
                    Gestión de identidad, sedes y reglas de negocio
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-6 border-b border-gray-100 mb-8 sticky top-0 bg-gray-100/95 backdrop-blur z-10 pt-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('company')}
                    className={cn(
                        "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                        activeTab === 'company' ? "border-nominix-electric text-nominix-electric" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Building2 size={16} /> Datos Empresa
                </button>
                <button
                    onClick={() => setActiveTab('policies')}
                    className={cn(
                        "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                        activeTab === 'policies' ? "border-nominix-electric text-nominix-electric" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Calculator size={16} /> Políticas y Factores
                </button>
                <button
                    onClick={() => setActiveTab('branches')}
                    className={cn(
                        "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                        activeTab === 'branches' ? "border-nominix-electric text-nominix-electric" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Store size={16} /> Sedes
                </button>
                <button
                    onClick={() => setActiveTab('organization')}
                    className={cn(
                        "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                        activeTab === 'organization' ? "border-nominix-electric text-nominix-electric" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Hash size={16} /> Estructura Organizativa
                </button>
            </div>

            {/* Content Switcher */}
            {loading ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                    {/* 1. DATOS EMPRESA */}
                    <div className={cn(activeTab !== 'company' && "hidden")}>
                        <CompanyForm
                            initialData={company}
                        />
                    </div>

                    {/* 2. POLÍTICAS (NUEVO) */}
                    <div className={cn(activeTab !== 'policies' && "hidden")}>
                        <PayrollPoliciesForm
                            initialData={policies}
                        />
                    </div>

                    {/* 3. SEDES */}
                    <div className={cn(activeTab !== 'branches' && "hidden")}>
                        <BranchManager
                            initialBranches={branches}
                            onRefresh={loadData}
                        />
                    </div>

                    {/* 4. ESTRUCTURA ORGANIZATIVA */}
                    <div className={cn(activeTab !== 'organization' && "hidden")}>
                        {/* Asumo que este componente lo tienes definido en otro archivo */}
                        <OrganizationManager />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTE: FORMULARIO DE POLÍTICAS (NUEVO) ---
const PayrollPoliciesForm = ({ initialData }) => {
    const [policy, setPolicy] = useState(initialData || {});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialData) setPolicy(initialData);
    }, [initialData]);

    const handleChange = (e) => setPolicy({ ...policy, [e.target.name]: e.target.value });

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axiosClient.put('/company/policies/', policy);
            setPolicy(res.data);
            toast.success('Políticas actualizadas');
        } catch (error) {
            toast.error('Error al guardar políticas');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                    <h3 className="text-lg font-black text-nominix-dark mb-2">Factores Globales</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Define los multiplicadores matemáticos que usará el motor de nómina para calcular conceptos variables.
                    </p>
                    <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Percent size={12} /> Ejemplo de Cálculo
                        </p>
                        <p className="text-xs text-blue-800 font-medium">
                            Si el salario diario es <strong>100 Bs</strong> y el factor de feriado es <strong>3.00</strong>:
                            <br />
                            <span className="block mt-2 font-mono text-xs bg-white/50 p-2 rounded">
                                Pago = 100 * 3.00 = 300 Bs
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2">
                        <Calculator size={14} /> Factores de Días Especiales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField
                            label="Factor Feriados / Domingos"
                            name="holiday_payout_factor"
                            type="number" step="0.01"
                            value={policy.holiday_payout_factor}
                            onChange={handleChange}
                            placeholder="Ej: 3.00" // Valor común en LOTTT (1+1.5+Descanso)
                        />
                        <InputField
                            label="Factor Descanso Trabajado"
                            name="rest_day_payout_factor"
                            type="number" step="0.01"
                            value={policy.rest_day_payout_factor}
                            onChange={handleChange}
                            placeholder="Ej: 1.50"
                        />
                    </div>
                </div>

                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2">
                        <Clock size={14} /> Recargos de Horas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InputField
                            label="Recargo H.E. Diurna"
                            name="overtime_day_factor"
                            type="number" step="0.01"
                            value={policy.overtime_day_factor}
                            onChange={handleChange}
                            placeholder="Ej: 1.50"
                        />
                        <InputField
                            label="Recargo H.E. Nocturna"
                            name="overtime_night_factor"
                            type="number" step="0.01"
                            value={policy.overtime_night_factor}
                            onChange={handleChange}
                            placeholder="Ej: 1.50" // LOTTT suele ser 1.5 base + 0.30 bono noc
                        />
                        <InputField
                            label="Tasa Bono Nocturno"
                            name="night_bonus_rate"
                            type="number" step="0.01"
                            value={policy.night_bonus_rate}
                            onChange={handleChange}
                            placeholder="Ej: 0.30" // 30%
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button disabled={saving} className="px-8 py-4 bg-nominix-dark text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center gap-2">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar Políticas
                    </button>
                </div>
            </div>
        </form>
    );
}

// --- SUB-COMPONENTE 1: FORMULARIO DE EMPRESA (Tuyo original, sin cambios lógicos) ---
const CompanyForm = ({ initialData }) => {
    // Nota: Recibimos initialData directamente. Como es una tab separada, podemos usar estado local
    // O si prefieres que se actualice al volver a cargar, usa useEffect.
    const [company, setCompany] = useState(initialData || {});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialData) setCompany(initialData);
    }, [initialData]);

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

    if (!company.name && !company.rif) return null; // Evitar render sin datos

    return (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda: Logo y Resumen */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-50 to-white z-0" />
                    <div className="relative z-10 w-32 h-32 rounded-full bg-white border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-500 cursor-pointer overflow-hidden">
                        <Building2 size={48} className="text-slate-300 group-hover:text-nominix-electric transition-colors" />
                    </div>
                    <h3 className="text-lg font-black text-nominix-dark relative z-10">{company.name || 'Sin Nombre'}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 relative z-10">{company.rif || 'J-...'}</p>
                </div>
            </div>

            {/* Columna Derecha: Campos */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
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

                    {/* Nueva Sección: Estrategia Salarial */}
                    <div className="mt-8 pt-8 border-t border-gray-50">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 flex items-center gap-2">
                            <DollarSign size={14} /> Estrategia de Retribución
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SelectField
                                label="Modo de División Salarial"
                                name="salary_split_mode"
                                value={company.salary_split_mode || 'PERCENTAGE'}
                                onChange={handleChange}
                                options={[
                                    { value: 'PERCENTAGE', label: 'Por Porcentaje' },
                                    { value: 'FIXED_BASE', label: 'Base Fija (Monto)' },
                                    { value: 'FIXED_BONUS', label: 'Bono Fijo (Monto)' }
                                ]}
                            />

                            {company.salary_split_mode === 'PERCENTAGE' && (
                                <InputField
                                    label="% Salario Base"
                                    name="split_percentage_base"
                                    type="number"
                                    step="0.01"
                                    placeholder="Ej: 30.00"
                                    value={company.split_percentage_base}
                                    onChange={handleChange}
                                />
                            )}

                            {(company.salary_split_mode === 'FIXED_BASE' || company.salary_split_mode === 'FIXED_BONUS') && (
                                <InputField
                                    label="Monto Fijo Referencia"
                                    name="split_fixed_amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={company.split_fixed_amount}
                                    onChange={handleChange}
                                />
                            )}
                            <div className="md:col-span-3 lg:col-span-3 text-[10px] text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                                {company.salary_split_mode === 'PERCENTAGE' && `El ${company.split_percentage_base || 0}% del Ingreso Total será Salario Base, el resto será Bono.`}
                                {company.salary_split_mode === 'FIXED_BASE' && `El Salario Base será fijo (${company.split_fixed_amount || 0}), todo excedente será Bono.`}
                                {company.salary_split_mode === 'FIXED_BONUS' && `El Bono será fijo (${company.split_fixed_amount || 0}), todo excedente será Salario Base.`}
                            </div>
                        </div>
                    </div>

                    {/* Visibilidad en Recibos */}
                    <div className="mt-8 pt-8 border-t border-gray-50">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4">Visibilidad en Recibos PDF</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ToggleField
                                label="Mostrar Sueldo Base"
                                name="show_base_salary"
                                checked={company.show_base_salary}
                                onChange={handleChange}
                            />
                            <ToggleField
                                label="Mostrar Complemento"
                                name="show_supplement"
                                checked={company.show_supplement}
                                onChange={handleChange}
                            />
                            <ToggleField
                                label="Mostrar Cestaticket"
                                name="show_tickets"
                                checked={company.show_tickets}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2"><Clock size={14} /> Frecuencias de Pago</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <SelectField
                            label="Frecuencia Nómina Salarial"
                            name="payroll_journey"
                            value={company.payroll_journey}
                            onChange={handleChange}
                            options={[
                                { value: 'WEEKLY', label: 'Semanal' },
                                { value: 'BIWEEKLY', label: 'Quincenal' },
                                { value: 'MONTHLY', label: 'Mensual' }
                            ]}
                        />
                        <SelectField
                            label="Frecuencia Cestaticket"
                            name="cestaticket_journey"
                            value={company.cestaticket_journey}
                            onChange={handleChange}
                            options={[
                                { value: 'MONTHLY', label: 'Mensual (Fecha única)' },
                                { value: 'PERIODIC', label: 'Proporcional cada pago' }
                            ]}
                        />
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

                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2"><MapPin size={14} /> Ubicación & Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-[9px] font-black uppercase text-gray-400 pl-3 mb-1 block tracking-wider">Dirección Fiscal</label>
                            <textarea
                                name="address"
                                value={company.address || ''}
                                onChange={handleChange}
                                className="w-full p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-sm text-nominix-dark outline-none resize-none h-24 focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 transition-all duration-300"
                            />
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

// --- SUB-COMPONENTE 2: GESTOR DE SEDES (Tuyo original) ---
const BranchManager = ({ initialBranches, onRefresh }) => {
    const [branches, setBranches] = useState(initialBranches);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);

    useEffect(() => {
        setBranches(initialBranches);
    }, [initialBranches]);

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        onRefresh();
    };
    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar sede? Si tiene empleados asociados no se podrá eliminar.")) return;
        try {
            await axiosClient.delete(`/branches/${id}/`);
            toast.success("Sede eliminada");
            onRefresh();
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

// --- SUB-COMPONENTE 3: MODAL DE SEDE (Tuyo original) ---
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

export default CompanySettings;