import React, { useState } from 'react';
import { X, Calendar, Type, CheckCircle2, Loader2 } from 'lucide-react';
import payrollService from '../../services/payroll.service';

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
        setLoading(true);
        try {
            await payrollService.createPeriod(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error creating period:", error);
            alert("Error al crear el periodo. Verifique los datos o si ya existe un periodo para estas fechas.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed inset-0 bg-nominix-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-black text-nominix-dark flex items-center gap-2">
                        <Calendar className="text-nominix-electric" size={24} />
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
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium placeholder:text-gray-300 transition-all"
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
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium transition-all"
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
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium transition-all"
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
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-nominix-electric/20 text-nominix-dark font-medium transition-all"
                            value={formData.payment_date}
                            onChange={handleChange}
                        />
                        <p className="mt-2 text-[10px] text-gray-400 font-medium">
                            Esta fecha se usará para determinar la tasa de cambio aplicable.
                        </p>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 bg-nominix-electric hover:bg-nominix-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-nominix-electric/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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
