import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { Search, Filter, Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import attendanceService from '../../services/attendance.service';
import EventsTable from './components/EventsTable';

/**
 * AttendanceLog - Registro completo de eventos de asistencia.
 * Paginación server-side por lotes de 50 eventos.
 * Palette: Nominix light theme.
 */
const PAGE_SIZE = 50;

const AttendanceLog = () => {
    const [events, setEvents] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        date_from: getTodayStr(),
        date_to: getTodayStr(),
        employee: '',
        event_type: '',
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const loadEvents = useCallback(async (targetPage = 1) => {
        setLoading(true);
        try {
            const data = await attendanceService.getEvents({
                ...filters,
                page: targetPage,
                page_size: PAGE_SIZE,
            });
            setEvents(data.results || []);
            setTotalCount(data.count || 0);
            setPage(targetPage);
        } catch (err) {
            console.error('Error loading events:', err);
            setEvents([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadEvents(1);
    }, []);

    const handleFilterChange = (field, value) => {
        setFilters(f => ({ ...f, [field]: value }));
    };

    const handleSearch = () => {
        loadEvents(1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const goToPage = (p) => {
        if (p >= 1 && p <= totalPages) loadEvents(p);
    };

    // Genera botones de paginación visibles
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
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
                                    className="w-full pl-9 pr-3 py-2 bg-nominix-smoke border border-gray-200 rounded-lg text-sm text-nominix-dark focus:outline-none focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric"
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
                                    className="w-full pl-9 pr-3 py-2 bg-nominix-smoke border border-gray-200 rounded-lg text-sm text-nominix-dark focus:outline-none focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric"
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
                                    className="w-full pl-9 pr-3 py-2 bg-nominix-smoke border border-gray-200 rounded-lg text-sm text-nominix-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric"
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
                                className="w-full px-3 py-2 bg-nominix-smoke border border-gray-200 rounded-lg text-sm text-nominix-dark focus:outline-none focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric"
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
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-nominix-electric hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            <Filter size={14} />
                            Filtrar
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Resultados */}
            <Card className="border-0">
                <CardHeader className="border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                            Registro de Marcajes
                            {!loading && (
                                <span className="ml-2 text-gray-400 font-normal">
                                    ({totalCount} evento{totalCount !== 1 ? 's' : ''})
                                </span>
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <EventsTable events={events} loading={loading} />

                    {/* Pagination Bar */}
                    {!loading && totalCount > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                            {/* Info */}
                            <span className="text-xs text-gray-400">
                                Mostrando {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} de {totalCount}
                            </span>

                            {/* Page Controls */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page <= 1}
                                    className="p-1.5 rounded-lg bg-nominix-smoke border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {getPageNumbers().map(p => (
                                    <button
                                        key={p}
                                        onClick={() => goToPage(p)}
                                        className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${p === page
                                                ? 'bg-nominix-electric text-white shadow-sm'
                                                : 'bg-nominix-smoke border border-gray-200 text-gray-500 hover:bg-gray-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className="p-1.5 rounded-lg bg-nominix-smoke border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export default AttendanceLog;
