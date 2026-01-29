import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Plus, Trash2, Calendar,
    AlertTriangle, Loader2, FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import variationsService from '../../../services/variations.service';
import Button from '../../../components/ui/Button';

// Modal de Registro de Variación
const VariationModal = ({ employeeId, onClose, onSuccess }) => {
    const [causes, setCauses] = useState([]);
    const [formData, setFormData] = useState({
        cause: '',
        start_date: '',
        end_date: '',
        notes: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Cargar causas
        variationsService.getCauses().then(res => setCauses(res));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await variationsService.createEmployeeVariation({
                ...formData,
                employee: employeeId
            });
            toast.success("Variación registrada");
            onSuccess();
            onClose();
        } catch (err) {
            // Manejar error de solapamiento del backend
            const msg = err.response?.data?.detail || "Error registrando variación.";
            setError(msg);
            toast.error("No se pudo registrar");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nominix-dark/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-black text-nominix-dark">Registrar Incidencia</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">Cancelar</button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                        <AlertTriangle className="text-red-500 shrink-0" size={16} />
                        <p className="text-xs text-red-600 font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Causa</label>
                        <select
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                            value={formData.cause}
                            onChange={e => setFormData({ ...formData, cause: e.target.value })}
                            required
                        >
                            <option value="">-- Seleccionar Causa --</option>
                            {causes.map(c => (
                                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Desde</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Hasta</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold outline-none focus:border-nominix-electric"
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 pl-2">Notas (Opcional)</label>
                        <textarea
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium outline-none resize-none h-20"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Detalles adicionales..."
                        />
                    </div>

                    <Button type="submit" loading={saving} className="w-full mt-2" variant="dark">
                        Registrar
                    </Button>
                </form>
            </div>
        </div>
    );
};

const EmployeeVariationsTab = ({ employeeId }) => {
    const [variations, setVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadVariations = async () => {
        setLoading(true);
        try {
            const data = await variationsService.getEmployeeVariations(employeeId);
            setVariations(data);
        } catch (error) {
            toast.error("Error cargando variaciones");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeId) loadVariations();
    }, [employeeId]);

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este registro de variación?")) return;
        try {
            await variationsService.deleteEmployeeVariation(id);
            toast.success("Eliminado");
            loadVariations();
        } catch (error) {
            toast.error("Error eliminando registro");
        }
    };

    return (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-nominix-dark">Historial de Incidencias</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        Vacaciones, Reposos y Permisos
                    </p>
                </div>
                <Button icon={Plus} onClick={() => setIsModalOpen(true)} size="sm">
                    Registrar
                </Button>
            </div>

            {loading ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" /></div>
            ) : variations.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                    <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-sm font-black text-gray-400">Sin incidencias registradas</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {variations.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-nominix-electric/30 transition-colors group">
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-3 rounded-lg shadow-sm text-nominix-electric">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-800">{v.cause_name}</h4>
                                        {/* Status Badge */}
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${v.is_processed ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                                            }`}>
                                            {v.is_processed ? 'Procesado' : 'Pendiente'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 mt-1">
                                        Desde <span className="font-bold text-gray-700">{format(parseISO(v.start_date), 'dd MMM yyyy', { locale: es })}</span> hasta <span className="font-bold text-gray-700">{format(parseISO(v.end_date), 'dd MMM yyyy', { locale: es })}</span>
                                    </p>
                                    {v.notes && <p className="text-[10px] text-gray-400 mt-1 italic">"{v.notes}"</p>}
                                </div>
                            </div>

                            {!v.is_processed && (
                                <button
                                    onClick={() => handleDelete(v.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <VariationModal
                    employeeId={employeeId}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={loadVariations}
                />
            )}
        </div>
    );
};

export default EmployeeVariationsTab;
