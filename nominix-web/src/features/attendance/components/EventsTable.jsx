import React from 'react';
import { Badge } from '../../../components/ui';

/**
 * EventsTable - Tabla de eventos de asistencia.
 * Palette: Nominix light theme — white bg, gray-100 borders, nominix-dark text.
 */

const EVENT_TYPE_CONFIG = {
    entry: { label: 'Entrada', class: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
    exit: { label: 'Salida', class: 'bg-blue-50 text-blue-600 border border-blue-200' },
    break_start: { label: 'Inicio Descanso', class: 'bg-amber-50 text-amber-600 border border-amber-200' },
    break_end: { label: 'Fin Descanso', class: 'bg-orange-50 text-orange-600 border border-orange-200' },
    unknown: { label: 'Desconocido', class: 'bg-gray-50 text-gray-500 border border-gray-200' },
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
            <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-sm text-gray-500">No se encontraron eventos de asistencia</p>
                <p className="text-xs mt-1 text-gray-400">Intenta cambiar los filtros o sincronizar el dispositivo</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100">
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
                                className={`border-b border-gray-50 hover:bg-nominix-smoke/60 transition-colors ${index % 2 !== 0 ? 'bg-gray-50/40' : ''}`}
                            >
                                <td className="py-3 px-4">
                                    <div>
                                        <p className="text-sm font-semibold text-nominix-dark">
                                            {formatTime(event.timestamp)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {formatDate(event.timestamp)}
                                        </p>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-xs font-mono bg-blue-50 text-nominix-electric px-2 py-1 rounded border border-blue-100">
                                        {event.employee_device_id || '—'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-sm text-nominix-dark">
                                        {event.employee_name || event.employee_display || '—'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${typeConfig.class}`}>
                                        {typeConfig.label}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-xs text-gray-500">
                                        {verifyLabel}
                                    </span>
                                </td>
                                {showDevice && (
                                    <td className="py-3 px-4">
                                        <span className="text-xs text-gray-500">
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
