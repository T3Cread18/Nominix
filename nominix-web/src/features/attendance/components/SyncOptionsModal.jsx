import React, { useState } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

/**
 * Modal para configurar opciones de sincronización (fecha de inicio).
 */
const SyncOptionsModal = ({ isOpen, onClose, onConfirm, title = "Sincronización Personalizada" }) => {
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('00:00');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        let finalDate = null;
        if (startDate) {
            // Combinar fecha y hora
            finalDate = `${startDate}T${startTime}:00`;
        }

        onConfirm(finalDate);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 text-blue-400">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <Calendar size={20} />
                    </div>
                    <h3 className="font-bold text-lg text-white">{title}</h3>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed">
                    Selecciona una fecha de inicio para forzar la resincronización de eventos antiguos.
                    <br />
                    <span className="text-xs text-gray-500 italic">Si se deja vacío, se usará la lógica automática (último evento registrado).</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Fecha de Inicio
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                            <div className="relative">
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-2 pl-9 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Sincronizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SyncOptionsModal;
