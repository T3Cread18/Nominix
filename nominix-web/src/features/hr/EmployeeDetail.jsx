import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    X,
    Save,
    Trash2,
    Plus,
    Briefcase,
    CreditCard,
    FileText,
    History,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const EmployeeDetail = ({ employeeId, onClose, onUpdate }) => {
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [currencies, setCurrencies] = useState([]);
    const [concepts, setConcepts] = useState([]);

    const [isAddingConcept, setIsAddingConcept] = useState(false);
    const [selectedGlobalConcept, setSelectedGlobalConcept] = useState('');
    const [addingConceptLoading, setAddingConceptLoading] = useState(false);

    useEffect(() => {
        if (employeeId) {
            fetchEmployee();
            fetchInitialData();
        }
    }, [employeeId]);

    const fetchInitialData = async () => {
        try {
            const [currRes, concRes] = await Promise.all([
                axiosClient.get('/currencies/'),
                axiosClient.get('/payroll-concepts/')
            ]);
            setCurrencies(currRes.data.results || currRes.data);
            setConcepts(concRes.data.results || concRes.data);
        } catch (error) {
            console.error("Error cargando datos maestros");
        }
    };

    const fetchEmployee = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.get(`/employees/${employeeId}/`);
            setEmployee(response.data);
        } catch (error) {
            console.error("Error cargando empleado");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axiosClient.put(`/employees/${employeeId}/`, employee);
            onUpdate();
            alert("Perfil actualizado correctamente");
        } catch (error) {
            alert("Error al guardar perfil");
        } finally {
            setSaving(false);
        }
    };

    const handleAddConcept = async () => {
        if (!selectedGlobalConcept) return;
        setAddingConceptLoading(true);
        try {
            await axiosClient.post('/employee-concepts/', {
                employee: employeeId,
                concept: selectedGlobalConcept,
                active: true
            });
            await fetchEmployee(); // Refresh employee data
            setIsAddingConcept(false);
            setSelectedGlobalConcept('');
            onUpdate(); // Trigger refresh in parent
        } catch (error) {
            alert(error.response?.data?.error || "Error al asignar concepto. Posiblemente ya está asignado.");
        } finally {
            setAddingConceptLoading(false);
        }
    };

    const handleRemoveConcept = async (conceptAssignmentId) => {
        if (!confirm("¿Eliminar esta asignación/deducción del empleado?")) return;
        try {
            await axiosClient.delete(`/employee-concepts/${conceptAssignmentId}/`);
            await fetchEmployee();
            onUpdate(); // Trigger refresh in parent
        } catch (error) {
            alert("Error al eliminar concepto");
        }
    };

    const handleUpdateConceptValue = async (id, newValue) => {
        try {
            await axiosClient.patch(`/employee-concepts/${id}/`, {
                override_value: newValue === '' ? null : newValue
            });
            await fetchEmployee();
            onUpdate(); // Trigger refresh in parent
        } catch (error) {
            console.error("Error actualizando valor");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="animate-spin text-nominix-electric" size={40} />
            <p className="text-[10px] font-black uppercase text-gray-400">Cargando expediente...</p>
        </div>
    );

    if (!employee) return null;

    const currentContract = employee.contracts?.find(c => c.is_active) || null;

    // Filter concepts not yet assigned
    const assignedConceptIds = employee.concepts?.map(ec => ec.concept) || [];
    const availableConcepts = concepts.filter(c => !assignedConceptIds.includes(c.id));

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Modal Añadir Concepto */}
            {isAddingConcept && (
                <div className="absolute inset-0 z-50 bg-nominix-dark/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-sm font-black text-nominix-dark uppercase tracking-widest">Asignar Nuevo Concepto</h4>
                            <button onClick={() => setIsAddingConcept(false)} className="text-gray-300 hover:text-nominix-dark transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Seleccionar Concepto Global</label>
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:border-nominix-electric outline-none"
                                    value={selectedGlobalConcept}
                                    onChange={(e) => setSelectedGlobalConcept(e.target.value)}
                                >
                                    <option value="">-- Elige un concepto --</option>
                                    {availableConcepts.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.code} - {c.name} ({c.kind === 'EARNING' ? 'Asig.' : 'Ded.'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleAddConcept}
                                disabled={addingConceptLoading || !selectedGlobalConcept}
                                className="w-full py-4 bg-nominix-electric text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-nominix-electric/90 disabled:opacity-30 transition-all shadow-lg shadow-nominix-electric/20"
                            >
                                {addingConceptLoading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                Confirmar Asignación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Header */}
            <div className="p-6 border-b flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-nominix-dark">{employee.full_name}</h3>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        Expediente Electrónico
                    </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={20} className="text-gray-400" />
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-4 pt-4 border-b bg-gray-50/30">
                {[
                    { id: 'profile', icon: FileText, label: 'Perfil' },
                    { id: 'contract', icon: Briefcase, label: 'Contrato' },
                    { id: 'payroll', icon: CreditCard, label: 'Conceptos' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                            activeTab === tab.id
                                ? 'border-nominix-electric text-nominix-electric'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        )}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'profile' && (
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-gray-400">Nombres</label>
                                <input
                                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-sm"
                                    value={employee.first_name || ''}
                                    onChange={e => setEmployee({ ...employee, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-gray-400">Apellidos</label>
                                <input
                                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-sm"
                                    value={employee.last_name || ''}
                                    onChange={e => setEmployee({ ...employee, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400">Cédula de Identidad</label>
                            <input
                                className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-sm"
                                value={employee.national_id || ''}
                                disabled
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400">Correo Electrónico</label>
                            <input
                                className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-sm"
                                value={employee.email || ''}
                                onChange={e => setEmployee({ ...employee, email: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-nominix-dark text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Actualizar Información
                        </button>
                    </form>
                )}

                {activeTab === 'contract' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {currentContract ? (
                            <div className="bg-nominix-dark text-white p-6 rounded-[2rem] relative overflow-hidden shadow-xl">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-nominix-electric mb-4">Contrato Vigente</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold opacity-60">Cargo</p>
                                            <p className="text-xl font-black">{currentContract.position}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold opacity-60">Salario</p>
                                            <p className="text-xl font-black text-nominix-electric">
                                                {currentContract.salary_amount} {currentContract.currency_data?.symbol}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between border-t border-white/10 pt-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold opacity-60">Frecuencia</p>
                                            <p className="text-xs font-bold">{currentContract.payment_frequency}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold opacity-60">Ingreso</p>
                                            <p className="text-xs font-bold">{currentContract.start_date}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed rounded-[2rem] border-gray-100 italic text-gray-400">
                                <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase">Sin contrato activo</p>
                                <button className="mt-4 text-nominix-electric text-[10px] font-black uppercase tracking-widest hover:underline">
                                    + Crear Nuevo Contrato
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Historial Contractual</h4>
                            <div className="space-y-3">
                                {employee.contracts?.map(c => (
                                    <div key={c.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <History size={16} className="text-nominix-dark opacity-40" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-nominix-dark">{c.position}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    {c.start_date} {c.end_date ? ` al ${c.end_date}` : '· Vigente'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            c.is_active ? "bg-green-500 shadow-lg shadow-green-500/20" : "bg-gray-200"
                                        )}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payroll' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Conceptos Salariales</h4>
                                <p className="text-[9px] font-bold text-nominix-electric uppercase tracking-tighter mt-0.5">Asignaciones y Deducciones Activas</p>
                            </div>
                            <button
                                onClick={() => setIsAddingConcept(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-nominix-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                            >
                                <Plus size={14} /> Añadir
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {employee.concepts?.length > 0 ? employee.concepts.map(ec => (
                                <div key={ec.id} className="group p-5 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-between hover:border-nominix-electric/30 hover:shadow-xl hover:shadow-nominix-electric/5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-2 h-12 rounded-full transition-transform group-hover:scale-y-110",
                                            ec.concept_data?.kind === 'EARNING' ? 'bg-green-400' : 'bg-red-400'
                                        )}></div>
                                        <div>
                                            <p className="text-sm font-black text-nominix-dark">{ec.concept_data?.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded border uppercase">
                                                    {ec.concept_data?.code}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                                                    {ec.concept_data?.computation_method?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-20 text-right font-black text-sm text-nominix-dark bg-transparent border-b border-white focus:border-nominix-electric outline-none py-1 transition-all"
                                                    defaultValue={ec.override_value || ec.concept_data?.value}
                                                    onBlur={(e) => handleUpdateConceptValue(ec.id, e.target.value)}
                                                />
                                                <span className="text-[10px] font-black text-gray-300 ml-1">
                                                    {ec.concept_data?.computation_method === 'PERCENTAGE_OF_BASIC' ? '%' : (ec.concept_data?.currency_data?.symbol || '$')}
                                                </span>
                                            </div>
                                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-tighter mt-1">
                                                {ec.override_value ? 'Monto Manual' : 'Valor Global'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveConcept(ec.id)}
                                            className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all scale-100 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-16 border-2 border-dashed rounded-[2.5rem] border-gray-50">
                                    <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CreditCard className="text-gray-200" size={24} />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin conceptos personalizados</p>
                                    <p className="text-[9px] font-bold text-gray-200 uppercase mt-1">Asigne bonos o deducciones manuales</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-nominix-smoke/50 p-6 rounded-[2rem] border border-gray-100">
                            <h5 className="text-[10px] font-black text-nominix-dark uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <AlertCircle size={14} className="text-nominix-electric" /> Consideración Legal
                            </h5>
                            <p className="text-[11px] text-gray-500 leading-relaxed font-bold">
                                Los conceptos estatuarios (IVSS, FAOV, INCES) se calculan automáticamente. Use esta pestaña para gestionar <span className="text-nominix-dark">Bonos de Productividad</span>, <span className="text-nominix-dark">Prestaciones Adelantadas</span> o <span className="text-nominix-dark">Deducciones Internas</span>.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-8 bg-gray-50 border-t">
                <button className="group w-full py-4 border-2 border-red-100 text-red-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300">
                    <Trash2 size={16} className="group-hover:animate-pulse" /> Dar de Baja (Cese Laboral)
                </button>
            </div>
        </div>
    );
};

export default EmployeeDetail;
