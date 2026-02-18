import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Loader2, Users, Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, WifiOff, Wifi, Search, Building2, Globe } from 'lucide-react';
import { Card, CardContent, InputField, SelectField } from '../../components/ui';
import attendanceService from '../../services/attendance.service';
import { useBranches } from '../../hooks/useOrganization';
import TimeBlock from './components/TimeBlock';

/**
 * DailyAttendanceView — Vista de Control Diario de Asistencia
 * Palette: nominix-dark #1A2B48, nominix-electric #0052FF, nominix-smoke #F8F9FA, surface #FFF
 */
const DailyAttendanceView = () => {
    const [date, setDate] = useState(getTodayStr());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);

    // Filtros
    const [branch, setBranch] = useState('');
    const [search, setSearch] = useState('');
    const [tz, setTz] = useState('');

    const { data: branches = [] } = useBranches();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await attendanceService.getDailyAttendance(date, {
                branch: branch || undefined,
                search: search || undefined,
                tz: tz || undefined,
                page,
                page_size: pageSize
            });

            if (result && result.results) {
                setData(result.results);
                setTotalCount(result.count || 0);
            } else if (Array.isArray(result)) {
                // Fallback backend viejo
                setData(result);
                setTotalCount(result.length);
            } else {
                setData([]);
                setTotalCount(0);
            }
        } catch (err) {
            console.error('Error loading daily attendance:', err);
            setError('Error al cargar datos de asistencia');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [date, branch, search, tz, page, pageSize]);

    useEffect(() => {
        // Implementamos un pequeño delay para la búsqueda si el usuario escribe rápido
        const timer = setTimeout(() => {
            loadData();
        }, search ? 400 : 0);

        return () => clearTimeout(timer);
    }, [loadData, search]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [date, branch, search, tz]);

    const changeDate = (delta) => {
        const d = new Date(date + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        setDate(d.toISOString().split('T')[0]);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= Math.ceil(totalCount / pageSize)) {
            setPage(newPage);
        }
    };

    // KPIs (Note: KPIs only reflect current page data now, ideal would be backend KPIs)
    // For now, we keep them based on visible data or we should ask backend for summary stats.
    // Assuming user accepts page-level KPIs for now or we remove them.
    // The previous code calculated KPIs from `data`. 
    // Since `data` is now paginated, KPIs are only for the page.
    // This is often acceptable in large datasets unless backend provides aggregate stats.
    const totalEmployees = totalCount; // Total count from backend
    const onTime = data.filter(d => d.blocks?.entry?.status === 'success').length; // Page only
    const late = data.filter(d => ['warning', 'danger'].includes(d.blocks?.entry?.status)).length; // Page only
    const missing = data.filter(d => d.blocks?.entry?.status === 'missing').length; // Page only

    const handleCorrect = () => {
        alert('Funcionalidad de corrección manual en desarrollo.');
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <div className="space-y-5">
            {/* Header — Date Nav + Filters + Refresh */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Date Navigator */}
                    <div className="flex items-center gap-1 bg-nominix-smoke border border-gray-100 rounded-xl p-1">
                        <button onClick={() => changeDate(-1)}
                            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-nominix-dark transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-2 px-2">
                            <Calendar size={14} className="text-nominix-electric" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold text-nominix-dark cursor-pointer outline-none"
                            />
                        </div>
                        <button onClick={() => changeDate(1)}
                            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-nominix-dark transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Selector de Sede */}
                    <div className="w-56">
                        <SelectField
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            options={[
                                { value: '', label: 'Todas las Sedes' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            icon={Building2}
                            placeholder="Filtrar Sede"
                            className="!py-1.5 !text-xs"
                        />
                    </div>

                    {/* Buscador Inteligente */}
                    <div className="w-64">
                        <InputField
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o CI..."
                            icon={Search}
                            className="!py-1.5 !text-xs"
                        />
                    </div>

                    {/* Selector de Zona Horaria (MODO PRUEBA) */}
                    <div className="w-44">
                        <SelectField
                            value={tz}
                            onChange={(e) => setTz(e.target.value)}
                            options={[
                                { value: '', label: 'TZ: Por defecto' },
                                { value: 'UTC', label: 'TZ: UTC' },
                                { value: 'America/Caracas', label: 'TZ: Caracas' },
                            ]}
                            icon={Globe}
                            className="!py-1.5 !text-[11px] border-amber-100 bg-amber-50/30"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => { setBranch(''); setSearch(''); setTz(''); setDate(getTodayStr()); }}
                        className="px-3 py-1.5 rounded-xl text-gray-400 text-xs font-bold hover:bg-nominix-smoke transition-colors">
                        Limpiar
                    </button>
                    <button onClick={loadData} disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-nominix-electric text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Actualizar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard icon={Users} label="Total (Global)" value={totalEmployees} bgColor="#f0f4ff" borderColor="#dbe4ff" iconColor="#0052FF" />
                <KpiCard icon={CheckCircle2} label="A Tiempo (Pág)" value={onTime} bgColor="#ecfdf5" borderColor="#a7f3d0" iconColor="#059669" />
                <KpiCard icon={Clock} label="Tarde (Pág)" value={late} bgColor="#fffbeb" borderColor="#fde68a" iconColor="#d97706" />
                <KpiCard icon={AlertTriangle} label="Sin Marca (Pág)" value={missing} bgColor="#fef2f2" borderColor="#fecaca" iconColor="#dc2626" />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {/* Main Table */}
            <Card className="border-0">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center py-16 text-gray-400 gap-2.5">
                            <Loader2 size={24} className="animate-spin" />
                            <span className="text-sm font-medium">Cargando asistencia...</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col justify-center items-center py-16 text-gray-400 gap-3">
                            <Users size={40} strokeWidth={1} className="text-gray-300" />
                            <span className="text-sm font-medium text-gray-500">No hay datos de asistencia para esta fecha</span>
                            <span className="text-xs text-gray-400">Sincronice eventos desde los dispositivos primero</span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Colaborador</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Entrada</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Sal. Almuerzo</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Ret. Almuerzo</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Salida</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Hrs. Efectivas</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 w-12">Sync</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((row, idx) => (
                                            <EmployeeRow key={row.employee?.id || idx} row={row} index={idx} onCorrect={handleCorrect} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                <div className="text-xs text-gray-400 font-medium">
                                    Mostrando {data.length} de {totalCount} colaboradores
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(page - 1)}
                                        disabled={page === 1}
                                        className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-nominix-dark disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-bold text-gray-600">
                                        Página {page} de {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(page + 1)}
                                        disabled={page >= totalPages}
                                        className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-nominix-dark disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// ─── Employee Row ──────────────────────────────────
const EmployeeRow = ({ row, index, onCorrect }) => {
    const { employee, blocks, effective_hours, schedule_name, is_synced } = row;

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    };

    const getAvatarBorder = () => {
        if (blocks?.entry?.status === 'missing' || blocks?.entry?.status === 'danger') return '#dc2626';
        if (blocks?.entry?.status === 'warning') return '#d97706';
        return '#059669';
    };

    const getHoursColor = () => {
        if (effective_hours >= 7.5) return '#059669';
        if (effective_hours >= 6) return '#d97706';
        if (effective_hours > 0) return '#dc2626';
        return '#d1d5db';
    };

    return (
        <tr className={`border-b border-gray-50 hover:bg-nominix-smoke/60 transition-colors ${index % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
            {/* Employee Info */}
            <td className="px-4 py-3" style={{ minWidth: '220px' }}>
                <div className="flex items-center gap-3">
                    {employee?.photo_url ? (
                        <img src={employee.photo_url} alt={employee.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            style={{ border: `2px solid ${getAvatarBorder()}` }} />
                    ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{
                                background: '#f0f4ff',
                                color: '#0052FF',
                                border: `2px solid ${getAvatarBorder()}`,
                            }}>
                            {getInitials(employee?.name)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-nominix-dark truncate" style={{ maxWidth: '180px' }}>
                            {employee?.name || 'Sin nombre'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                            {employee?.department || schedule_name || ''}
                        </div>
                    </div>
                </div>
            </td>

            {/* Time Blocks */}
            <td className="px-3 py-3 text-center">
                <TimeBlock block={blocks?.entry} label="Entrada" expectedTime={blocks?.entry?.expected_time} onCorrect={onCorrect} />
            </td>
            <td className="px-3 py-3 text-center">
                <TimeBlock block={blocks?.lunch_out} label="Sal. Almuerzo" expectedTime={blocks?.lunch_out?.expected_time} onCorrect={onCorrect} />
            </td>
            <td className="px-3 py-3 text-center">
                <TimeBlock block={blocks?.lunch_in} label="Ret. Almuerzo" expectedTime={blocks?.lunch_in?.expected_time} onCorrect={onCorrect} />
            </td>
            <td className="px-3 py-3 text-center">
                <TimeBlock block={blocks?.exit} label="Salida" expectedTime={blocks?.exit?.expected_time} onCorrect={onCorrect} />
            </td>

            {/* Effective Hours */}
            <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xl font-black tracking-tight" style={{ color: getHoursColor(), fontFamily: "'Inter', sans-serif" }}>
                        {effective_hours > 0 ? effective_hours.toFixed(1) : '—'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">horas</span>
                </div>
            </td>

            {/* Sync */}
            <td className="px-4 py-3 text-center">
                {is_synced ? (
                    <Wifi size={16} className="text-emerald-500 mx-auto" />
                ) : (
                    <WifiOff size={16} className="text-gray-300 mx-auto" />
                )}
            </td>
        </tr>
    );
};

// ─── KPI Card ──────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, bgColor, borderColor, iconColor }) => (
    <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    }}>
        <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'white',
            border: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Icon size={18} style={{ color: iconColor }} />
        </div>
        <div>
            <div className="text-xl font-black text-nominix-dark leading-none tracking-tight">
                {value}
            </div>
            <div className="text-[11px] text-gray-500 font-semibold">
                {label}
            </div>
        </div>
    </div>
);

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export default DailyAttendanceView;
