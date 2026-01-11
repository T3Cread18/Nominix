import React, { useState } from 'react';
import { X, Calendar, Type, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import payrollService from '../../services/payroll.service';
import { toast } from 'sonner'; // <--- 1. Importamos Toast

const CreatePeriodModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        payment_date: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 2. Validación básica de lógica de negocio
        if (new Date(formData.end_date) < new Date(formData.start_date)) {
            toast.error("La fecha de fin no puede ser anterior al inicio");
            return;
        }

        setLoading(true);
        try {
            await payrollService.createPeriod(formData);

            toast.success("Periodo creado correctamente"); // Feedback visual

            // 3. BLINDAJE CONTRA ERRORES (El arreglo importante)
            // Usamos el operador ?.() para ejecutar solo si la función existe
            onSuccess?.();
            onClose?.();

        } catch (error) {
            console.error("Error creating period:", error);
            // Mensaje de error más amigable
            const msg = error.response?.data?.detail || "Error al crear el periodo. Verifica las fechas.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed inset-0 bg-nominix-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Click fuera para cerrar (Opcional, mejora UX) */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative z-10">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-black text-nominix-dark flex items-center gap-2">
                        <div className="p-2 bg-nominix-electric/10 rounded-xl">
                            <Calendar className="text-nominix-electric" size={24} />
                        </div>
                        Nuevo Periodo
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Type size={14} /> Nombre del Periodo
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            placeholder="Ej: 1ra Quincena Enero 2026"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium placeholder:text-gray-300 transition-all focus:bg-white"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Fecha Inicio
                            </label>
                            <input
                                type="date"
                                name="start_date"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium transition-all focus:bg-white"
                                value={formData.start_date}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Fecha Fin
                            </label>
                            <input
                                type="date"
                                name="end_date"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium transition-all focus:bg-white"
                                value={formData.end_date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Fecha de Pago (Cierre)
                        </label>
                        <input
                            type="date"
                            name="payment_date"
                            required
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium transition-all focus:bg-white"
                            value={formData.payment_date}
                            onChange={handleChange}
                        />
                        <div className="mt-2 flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <p className="text-[10px] font-bold leading-tight">
                                Importante: Esta fecha determinará la tasa BCV aplicada para el cálculo de nómina en divisas.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 bg-nominix-electric hover:bg-nominix-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-nominix-electric/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={18} />
                            )}
                            Crear Periodo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePeriodModal;