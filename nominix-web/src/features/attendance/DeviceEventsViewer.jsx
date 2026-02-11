import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { Search, Loader2, ChevronLeft, ChevronRight, RefreshCw, Terminal } from 'lucide-react';
import attendanceService from '../../services/attendance.service';

/**
 * DeviceEventsViewer — Visor de Eventos Raw desde dispositivos biométricos.
 * Palette: Nominix light theme.
 */

const inputStyles = "w-full px-3 py-2 bg-nominix-smoke border border-gray-200 rounded-lg text-sm text-nominix-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric";
const selectStyles = inputStyles;
const labelStyles = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5";

const DeviceEventsViewer = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const [totalEvents, setTotalEvents] = useState(0);

    // Filtros
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    // Paginación
    const [page, setPage] = useState(1);
    const pageSize = 20;

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        try {
            const data = await attendanceService.getDevices();
            setDevices(Array.isArray(data) ? data : []);
            if (data.length > 0) {
                setSelectedDevice(String(data[0].id));
            }
        } catch (error) {
            console.error('Error loading devices', error);
        }
    };

    const fetchEvents = useCallback(async (newPage = 1) => {
        if (!selectedDevice) return;

        setLoading(true);
        try {
            const result = await attendanceService.getDeviceEvents(selectedDevice, {
                start_time: `${dateFrom}T00:00:00`,
                end_time: `${dateTo}T23:59:59`,
                page: newPage,
                page_size: pageSize
            });

            setEvents(result.events || []);
            setTotalEvents(result.total || 0);
            setPage(newPage);
        } catch (error) {
            console.error('Error fetching device events', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDevice, dateFrom, dateTo]);

    const totalPages = Math.ceil(totalEvents / pageSize);

    return (
        <div className="space-y-4">
            {/* Controles */}
            <Card className="border-0">
                <CardHeader className="border-b border-gray-100 pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Terminal size={16} className="text-nominix-electric" />
                        Visor de Eventos en Bruto (Directo del Dispositivo)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="col-span-1 md:col-span-2">
                            <label className={labelStyles}>Dispositivo</label>
                            <select
                                value={selectedDevice}
                                onChange={(e) => setSelectedDevice(e.target.value)}
                                className={selectStyles}
                            >
                                <option value="">Seleccionar...</option>
                                {devices.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.ip_address})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelStyles}>Desde</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className={inputStyles}
                            />
                        </div>

                        <div>
                            <label className={labelStyles}>Hasta</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className={inputStyles}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => fetchEvents(1)}
                            disabled={loading || !selectedDevice}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-nominix-electric hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Consultar Eventos
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de Resultados */}
            <Card className="border-0">
                <CardHeader className="border-b border-gray-100 pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">
                        Resultados
                        {!loading && events.length > 0 && (
                            <span className="ml-2 text-gray-400 font-normal">
                                (Total: {totalEvents} — Página {page} de {totalPages})
                            </span>
                        )}
                    </CardTitle>

                    {/* Paginación */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchEvents(page - 1)}
                            disabled={loading || page <= 1}
                            className="p-1.5 rounded-lg bg-nominix-smoke border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-500"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs text-gray-500 font-mono w-8 text-center font-bold">
                            {page}
                        </span>
                        <button
                            onClick={() => fetchEvents(page + 1)}
                            disabled={loading || events.length < pageSize}
                            className="p-1.5 rounded-lg bg-nominix-smoke border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-500"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 size={32} className="text-nominix-electric animate-spin" />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 border border-gray-100 mb-3">
                                <Search size={20} className="text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-500">No se encontraron eventos</p>
                            <p className="text-xs mt-1 text-gray-400">
                                Ajusta los filtros y presiona Consultar
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 text-left">
                                        <th className="text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Timestamp</th>
                                        <th className="text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">ID Empleado</th>
                                        <th className="text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Nombre (Disp.)</th>
                                        <th className="text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Tipo</th>
                                        <th className="text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Verificación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((evt, i) => (
                                        <tr key={i} className={`border-b border-gray-50 hover:bg-nominix-smoke/60 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                            <td className="py-3 px-4 text-xs font-mono text-gray-500">
                                                {new Date(evt.timestamp).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-xs font-mono bg-blue-50 text-nominix-electric px-2 py-1 rounded border border-blue-100">
                                                    {evt.employee_device_id}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-nominix-dark">
                                                {evt.employee_name || '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <EventTypeBadge type={evt.event_type} />
                                            </td>
                                            <td className="py-3 px-4 text-xs text-gray-500">
                                                {evt.verification_mode}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const EventTypeBadge = ({ type }) => {
    const config = {
        entry: { color: 'text-emerald-600 bg-emerald-50 border border-emerald-200', label: 'Entrada' },
        exit: { color: 'text-rose-600 bg-rose-50 border border-rose-200', label: 'Salida' },
        break_start: { color: 'text-amber-600 bg-amber-50 border border-amber-200', label: 'Inicio Descanso' },
        break_end: { color: 'text-blue-600 bg-blue-50 border border-blue-200', label: 'Fin Descanso' },
        unknown: { color: 'text-gray-500 bg-gray-50 border border-gray-200', label: 'Desconocido' },
    };

    const { color, label } = config[type] || config.unknown;

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`}>
            {label}
        </span>
    );
};

export default DeviceEventsViewer;
