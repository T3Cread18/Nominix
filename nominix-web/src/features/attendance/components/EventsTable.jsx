import React from 'react';
import { Badge } from '../../../components/ui';

/**
 * EventsTable - Tabla de eventos de asistencia.
 * 
 * Columnas: Hora, Empleado, Tipo, Verificación, Dispositivo
 * Badges coloreados por tipo de evento.
 */

const EVENT_TYPE_CONFIG = {
    entry: { label: 'Entrada', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    exit: { label: 'Salida', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    break_start: { label: 'Inicio Descanso', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    break_end: { label: 'Fin Descanso', class: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    unknown: { label: 'Desconocido', class: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

const VERIFICATION_LABELS = {
    fingerprint: '🖐️ Huella',
    card: '💳 Tarjeta',
    face: '👤 Rostro',
    password: '🔑 Contraseña',
    combined: '🔒 Combinado',
    other: '❓ Otro',
};

const EventsTable = ({ events = [], loading = false, showDevice = true }) => {
    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No se encontraron eventos de asistencia</p>
                <p className="text-xs mt-1 opacity-60">Intenta cambiar los filtros o sincronizar el dispositivo</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">
                            Fecha / Hora
                        </th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">
                            ID Empleado
                        </th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">
                            Empleado
                        </th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">
                            Tipo
                        </th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">
                            Verificación
                        </th>
                        {showDevice && (
                            <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">
                                Dispositivo
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {events.map((event, index) => {
                        const typeConfig = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.unknown;
                        const verifyLabel = VERIFICATION_LABELS[event.verification_mode] || VERIFICATION_LABELS.other;

                        return (
                            <tr
                                key={event.id || index}
                                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                            >
                                <td className="py-3 px-4">
                                    <div>
                                        <p className="text-sm font-semibold">
                                            {formatTime(event.timestamp)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {formatDate(event.timestamp)}
                                        </p>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">
                                        {event.employee_device_id || '—'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-sm">
                                        {event.employee_name || event.employee_display || '—'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${typeConfig.class}`}>
                                        {typeConfig.label}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-xs text-gray-300">
                                        {verifyLabel}
                                    </span>
                                </td>
                                {showDevice && (
                                    <td className="py-3 px-4">
                                        <span className="text-xs text-gray-400">
                                            {event.device_name || event.device || '—'}
                                        </span>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

function formatTime(timestamp) {
    if (!timestamp) return '—';
    try {
        const d = new Date(timestamp);
        return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return timestamp;
    }
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    try {
        const d = new Date(timestamp);
        return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

export default EventsTable;
export { EVENT_TYPE_CONFIG, VERIFICATION_LABELS };
