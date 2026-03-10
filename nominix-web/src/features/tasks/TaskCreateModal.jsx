import React, { useState, useEffect } from 'react';
import {
    X, Save, AlertCircle, Zap,
    ChevronRight, ChevronLeft, Check,
    Clock, MapPin, User, FileText,
    Flag, RefreshCcw
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useBranches } from '../../hooks/useOrganization';
import { useEmployees } from '../../hooks/useEmployees';
import { tasksService } from '../../api/tasksService';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const STEPS = [
    { id: 1, title: 'Definición', icon: FileText },
    { id: 2, title: 'Asignación', icon: User },
    { id: 3, title: 'Programación', icon: Clock },
];

const PRIORITIES = [
    { value: 'LOW', label: 'Baja', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    { value: 'NORMAL', label: 'Normal', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: 'HIGH', label: 'Alta', color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { value: 'URGENT', label: 'Urgente', color: 'bg-red-50 text-red-600 border-red-200' },
];

const FREQUENCIES = [
    { value: 'MANUAL', label: 'Manual', desc: 'Una sola vez', icon: Zap },
    { value: 'DAILY', label: 'Diario', desc: 'Cada día', icon: RefreshCcw },
    { value: 'WEEKLY', label: 'Semanal', desc: 'Por semana', icon: RefreshCcw },
    { value: 'MONTHLY', label: 'Mensual', desc: 'Cada mes', icon: RefreshCcw },
];

export default function TaskCreateModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        sede: '',
        assignee: '',
        priority: 'NORMAL',
        due_date: '',
        checklist_template: '',
        frequency: 'MANUAL',
        preferred_time: '',
    });
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);

    const { data: branches = [] } = useBranches();
    const { data: employeesData } = useEmployees({ branch: formData.sede });
    const employees = employeesData?.results || [];

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            tasksService.getChecklistTemplates()
                .then(data => setTemplates(data.results || data || []))
                .catch(err => console.error("Error loading templates", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step === 1 && (!formData.title || !formData.sede)) {
            return toast.error("El título y la sede son necesarios");
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await tasksService.createTask(formData);
            toast.success("Tarea creada exitosamente");
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("No se pudo crear la tarea");
        } finally {
            setLoading(false);
        }
    };

    const currentTemplate = templates.find(t => t.id === parseInt(formData.checklist_template));

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">

                {/* Header Premium */}
                <div className="p-8 border-b bg-slate-50/50">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Nueva Auditoría</h3>
                            <p className="text-sm text-slate-500 font-medium">Configura el proceso operativo paso a paso.</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all shadow-sm">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stepper Logic */}
                    <div className="flex justify-between items-center px-4 relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2" />
                        {STEPS.map((s, i) => (
                            <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-50/50">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4",
                                    step >= s.id
                                        ? "bg-nominix-electric border-nominix-electric text-white scale-110 shadow-lg shadow-nominix-electric/20"
                                        : "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    step >= s.id ? "text-nominix-electric" : "text-slate-400"
                                )}>{s.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {/* PASO 1: DEFINICIÓN */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Checklist Base</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-nominix-electric outline-none transition-all font-bold text-slate-700"
                                        value={formData.checklist_template}
                                        onChange={(e) => {
                                            const tpl = templates.find(t => t.id === parseInt(e.target.value));
                                            setFormData({
                                                ...formData,
                                                checklist_template: e.target.value,
                                                title: e.target.value ? `Ejecución de ${tpl?.name}` : formData.title,
                                                frequency: tpl?.frequency || 'MANUAL',
                                                preferred_time: tpl?.preferred_time || ''
                                            });
                                        }}
                                    >
                                        <option value="">+ Crear Tarea Simple (Sin checklist)</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Sede de Ejecución</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-nominix-electric" />
                                    <select
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-nominix-electric outline-none transition-all font-bold text-slate-700"
                                        value={formData.sede}
                                        onChange={(e) => setFormData({ ...formData, sede: e.target.value, assignee: '' })}
                                    >
                                        <option value="">Selecciona SUCURSAL</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Título de Referencia</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-nominix-electric outline-none transition-all font-bold"
                                    placeholder="Ej: Auditoría de Inventario Semanal"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* PASO 2: ASIGNACIÓN Y PRIORIDAD */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Nivel de Prioridad</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {PRIORITIES.map(p => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: p.value })}
                                            className={cn(
                                                "px-3 py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                                formData.priority === p.value
                                                    ? `${p.color} border-current shadow-sm`
                                                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Responsable Directo</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {!formData.sede ? (
                                        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                            <p className="text-xs text-slate-400">Debes seleccionar una sede primero</p>
                                        </div>
                                    ) : employees.length === 0 ? (
                                        <div className="p-4 bg-blue-50/50 rounded-2xl text-center">
                                            <p className="text-xs text-blue-500 font-medium">Buscando personal en {branches.find(b => b.id === parseInt(formData.sede))?.name}...</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                                            {employees.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, assignee: emp.id })}
                                                    className={cn(
                                                        "w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all",
                                                        formData.assignee === emp.id
                                                            ? "border-nominix-electric bg-nominix-electric/5"
                                                            : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                            {emp.full_name?.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">{emp.full_name}</span>
                                                    </div>
                                                    {formData.assignee === emp.id && <Check className="w-4 h-4 text-nominix-electric" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: PROGRAMACIÓN */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">¿Con qué frecuencia se repite?</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {FREQUENCIES.map(f => (
                                        <button
                                            key={f.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, frequency: f.value })}
                                            className={cn(
                                                "p-5 rounded-3xl border-2 text-left transition-all relative group",
                                                formData.frequency === f.value
                                                    ? "border-nominix-electric bg-nominix-electric/5 shadow-sm"
                                                    : "border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                                                formData.frequency === f.value ? "bg-nominix-electric text-white" : "bg-white text-slate-400 group-hover:text-slate-600"
                                            )}>
                                                <f.icon className="w-5 h-5" />
                                            </div>
                                            <h4 className="font-black text-slate-800 tracking-tight">{f.label}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{f.desc}</p>
                                            {formData.frequency === f.value && (
                                                <div className="absolute top-4 right-4 text-nominix-electric">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Límite Próxima Ejecución</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-nominix-electric outline-none transition-all font-bold text-slate-700"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Hora Sugerida</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-nominix-electric" />
                                        <input
                                            type="time"
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-nominix-electric outline-none transition-all font-bold text-slate-700"
                                            value={formData.preferred_time}
                                            onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-nominix-ocean/5 rounded-2xl border border-nominix-ocean/10 flex gap-4 items-start">
                                <AlertCircle className="w-5 h-5 text-nominix-ocean shrink-0" />
                                <p className="text-xs text-nominix-ocean font-medium leading-relaxed">
                                    Las tareas recurrentes se generarán automáticamente {formData.frequency === 'DAILY' ? 'cada mañana' : 'según el calendario establecido'}.
                                    Asegúrate de que el responsable tenga activas las notificaciones.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer buttons */}
                <div className="p-8 border-t flex gap-4 bg-slate-50/30">
                    {step > 1 && (
                        <Button variant="ghost" onClick={handleBack} className="flex-1 py-7 rounded-2xl hover:bg-white gap-2 text-slate-500 font-bold border">
                            <ChevronLeft className="w-5 h-5" /> Anterior
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button onClick={handleNext} className="flex-[2] py-7 bg-nominix-electric hover:bg-nominix-ocean text-white rounded-2xl shadow-xl shadow-nominix-electric/20 gap-2 font-black uppercase tracking-widest text-xs">
                            Continuar <ChevronRight className="w-5 h-5" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="flex-[2] py-7 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-900/10 gap-2 font-black uppercase tracking-widest text-xs">
                            <Save className="w-5 h-5" /> {loading ? 'Creando...' : 'Finalizar y Crear'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
