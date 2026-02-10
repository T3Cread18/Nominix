import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { Search, Filter, Calendar, Download } from 'lucide-react';
import attendanceService from '../../services/attendance.service';
import EventsTable from './components/EventsTable';

/**
 * AttendanceLog - Registro completo de eventos de asistencia.
 * 
 * Tabla con filtros: rango de fechas, ID empleado, tipo de evento.
 * Paginación y búsqueda.
 */
const AttendanceLog = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        date_from: getTodayStr(),
        date_to: getTodayStr(),
        employee: '',
        event_type: '',
    });

    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await attendanceService.getEvents(filters);
            setEvents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading events:', err);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadEvents();
    }, []); // Load on mount only; user triggers reload via search button

    const handleFilterChange = (field, value) => {
        setFilters(f => ({ ...f, [field]: value }));
    };

    const handleSearch = () => {
        loadEvents();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <Card className="border-0">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        {/* Fecha Desde */}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                Desde
                            </label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full pl-9 pr-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>
                        </div>

                        {/* Fecha Hasta */}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                Hasta
                            </label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.date_to}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full pl-9 pr-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>
                        </div>

                        {/* Empleado */}
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                Empleado / Cédula
                            </label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={filters.employee}
                                    onChange={(e) => handleFilterChange('employee', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Buscar por cédula..."
                                    className="w-full pl-9 pr-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>
                        </div>

                        {/* Tipo de evento */}
                        <div className="min-w-[150px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                Tipo
                            </label>
                            <select
                                value={filters.event_type}
                                onChange={(e) => handleFilterChange('event_type', e.target.value)}
                                className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                            >
                                <option value="">Todos</option>
                                <option value="entry">Entrada</option>
                                <option value="exit">Salida</option>
                                <option value="break_start">Inicio Descanso</option>
                                <option value="break_end">Fin Descanso</option>
                            </select>
                        </div>

                        {/* Botón buscar */}
                        <button
                            onClick={handleSearch}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            <Filter size={14} />
                            Filtrar
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Resultados */}
            <Card className="border-0">
                <CardHeader className="border-b border-white/5 pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                            Registro de Marcajes
                            {!loading && (
                                <span className="ml-2 text-gray-400 font-normal">
                                    ({events.length} evento{events.length !== 1 ? 's' : ''})
                                </span>
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <EventsTable events={events} loading={loading} />
                </CardContent>
            </Card>
        </div>
    );
};

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export default AttendanceLog;
