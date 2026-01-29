import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Plus, Edit, Trash2, Calendar,
    CheckCircle2, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import variationsService from '../../services/variations.service';
import axiosClient from '../../api/axiosClient';
import Button from '../../components/ui/Button';

// Modal de Creación/Edición
const CauseModal = ({ cause, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        category: 'ABSENCE',
        is_paid: false,
        affects_salary_days: true,
        pay_concept_code: ''
    });
    const [concepts, setConcepts] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Cargar conceptos para el dropdown
        axiosClient.get('/payroll-concepts/?active=true').then(res => {
            const data = res.data.results || res.data;
            setConcepts(data);
        });

        if (cause) {
            setFormData({
                code: cause.code,
                name: cause.name,
                category: cause.category,
                is_paid: cause.is_paid,
                affects_salary_days: cause.affects_salary_days,
                pay_concept_code: cause.pay_concept_code || ''
            });
        }
    }, [cause]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (cause) {
                await variationsService.updateCause(cause.code, formData);
                toast.success("Causa actualizada");
            } else {
                await variationsService.createCause(formData);
                toast.success("Causa creada");
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Error guardando causa. Verifique el código.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nominix-dark/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-black text-nominix-dark">{cause ? 'Editar Causa' : 'Nueva Causa'}</h3>
                    <button onClick={onClose}><XCircle size={24} className="text-gray-300 hover:text-gray-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Código</label>
                            <input
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                                disabled={!!cause} // Código es PK
                                placeholder="Ej: VAC"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Categoría</label>
                            <select
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="ABSENCE">Ausencia / Falta</option>
                                <option value="VACATION">Vacaciones</option>
                                <option value="PERMISSION">Permiso</option>
                                <option value="MATERNITY">Licencia Médica</option>
                                <option value="OTHER">Otro</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Nombre</label>
                        <input
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Descripción breve (ej: Vacaciones Legales)"
                        />
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-600">¿Es Remunerado?</label>
                            <input
                                type="checkbox"
                                className="w-5 h-5 accent-nominix-electric"
                                checked={formData.is_paid}
                                onChange={e => setFormData({ ...formData, is_paid: e.target.checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-600">¿Descuenta Días de Salario?</label>
                            <input
                                type="checkbox"
                                className="w-5 h-5 accent-nominix-electric"
                                checked={formData.affects_salary_days}
                                onChange={e => setFormData({ ...formData, affects_salary_days: e.target.checked })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Concepto de Pago (Opcional)</label>
                        <select
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                            value={formData.pay_concept_code}
                            onChange={e => setFormData({ ...formData, pay_concept_code: e.target.value })}
                        >
                            <option value="">-- Sin Concepto Asociado --</option>
                            {concepts.map(c => (
                                <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-gray-400 px-2">
                            Si se selecciona, el sistema generará una novedad automática con este concepto.
                        </p>
                    </div>

                    <Button type="submit" loading={saving} className="w-full mt-4" variant="dark">
                        {saving ? 'Guardando...' : 'Guardar Causa'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

const VariationCausesPage = () => {
    const [causes, setCauses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCause, setEditingCause] = useState(null);

    const loadCauses = async () => {
        setLoading(true);
        try {
            const data = await variationsService.getCauses();
            setCauses(data);
        } catch (error) {
            toast.error("Error cargando causas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCauses();
    }, []);

    const handleDelete = async (code) => {
        if (!confirm("¿Eliminar esta causa?")) return;
        try {
            await variationsService.deleteCause(code);
            toast.success("Eliminado");
            loadCauses();
        } catch (error) {
            toast.error("No se puede eliminar (probablemente en uso)");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-nominix-dark">Causas de Variación</h1>
                    <p className="text-sm text-gray-500 font-medium">Configure los tipos de ausencias, permisos y vacaciones</p>
                </div>
                <Button
                    icon={Plus}
                    onClick={() => {
                        setEditingCause(null);
                        setIsModalOpen(true);
                    }}
                >
                    Nueva Causa
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {causes.map(cause => (
                        <div key={cause.code} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingCause(cause);
                                        setIsModalOpen(true);
                                    }}
                                    className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-nominix-electric hover:text-white transition-colors"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(cause.code)}
                                    className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                                    {cause.code}
                                </div>
                                <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${cause.category === 'VACATION' ? 'bg-orange-100 text-orange-600' :
                                    cause.category === 'ABSENCE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {cause.category_display || cause.category}
                                </div>
                            </div>

                            <h3 className="font-bold text-lg text-nominix-dark mb-2">{cause.name}</h3>

                            <div className="space-y-2 mt-4">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                    {cause.is_paid ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-gray-300" />}
                                    <span>{cause.is_paid ? 'Remunerado' : 'No Remunerado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                    {cause.affects_salary_days ? <AlertCircle size={14} className="text-red-400" /> : <CheckCircle2 size={14} className="text-gray-300" />}
                                    <span>{cause.affects_salary_days ? 'Descuenta Días Salario' : 'No Descuenta Días'}</span>
                                </div>
                                {cause.pay_concept_code && (
                                    <div className="mt-3 pt-3 border-t border-gray-50">
                                        <p className="text-[10px] font-black text-gray-300 uppercase">Genera Concepto</p>
                                        <p className="text-xs font-bold text-nominix-electric">{cause.pay_concept_code}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <CauseModal
                    cause={editingCause}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={loadCauses}
                />
            )}
        </div>
    );
};

export default VariationCausesPage;
