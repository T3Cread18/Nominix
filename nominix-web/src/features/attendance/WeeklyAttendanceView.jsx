import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, RefreshCw, Loader2, Users, Building2, Search, Globe, ChevronLeft, ChevronRight, Clock, Info } from 'lucide-react';
import { Card, CardContent, InputField, SelectField } from '../../components/ui';
import attendanceService from '../../services/attendance.service';
import { useBranches } from '../../hooks/useOrganization';

/**
 * Gets a week's date range (Monday to Sunday) given any date string (YYYY-MM-DD).
 * Creates dates assuming local time at midnight to prevent timezone boundary drifts.
 */
function getWeekRange(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date at noon local time to avoid timezone edge cases around midnight
    const d = new Date(year, month - 1, day, 12, 0, 0);

    // getDay() is 0 (Sun) to 6 (Sat). We want Monday=1, Sunday=7.
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();

    // Go to Monday
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek + 1);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const next = new Date(monday);
        next.setDate(monday.getDate() + i);
        // Format to YYYY-MM-DD using local methods to preserve the exact date
        const y = next.getFullYear();
        const m = String(next.getMonth() + 1).padStart(2, '0');
        const dd = String(next.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${dd}`);
    }
    return dates;
}

const WeekCell = ({ dayData, date }) => {
    if (!dayData) return <td className="px-2 py-3 text-center text-gray-400 font-medium">—</td>;

    const { blocks, effective_hours, is_synced } = dayData;
    const entry = blocks?.entry;
    const exit = blocks?.exit;

    // Colores
    let bgClass = "bg-transparent";
    let textClass = "text-gray-400";
    let borderClass = "border-transparent";

    if (effective_hours >= 7.5) {
        bgClass = "bg-emerald-50"; textClass = "text-emerald-600"; borderClass = "border-emerald-200";
    } else if (effective_hours > 0) {
        bgClass = "bg-amber-50"; textClass = "text-amber-600"; borderClass = "border-amber-200";
    } else if (entry?.status === 'danger' || entry?.status === 'missing') {
        bgClass = "bg-red-50"; textClass = "text-red-500"; borderClass = "border-red-100";
    }

    if (!is_synced && effective_hours === 0) {
        bgClass = "bg-gray-50/50";
        textClass = "text-gray-300";
    }

    return (
        <td className="px-2 py-3 text-center align-middle">
            <div className={`group relative inline-flex flex-col items-center justify-center w-14 h-14 rounded-xl border ${bgClass} ${borderClass} transition-colors cursor-default`}>
                <span className={`text-[13px] font-black ${textClass}`}>
                    {effective_hours > 0 ? effective_hours.toFixed(1) : '-'}
                </span>
                {effective_hours > 0 && <span className="text-[9px] font-semibold text-gray-400">hrs</span>}

                {/* Tooltip on hover */}
                <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 rounded-xl bg-[#1A2B48] text-white text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl pointer-events-none">
                    <div className="font-bold text-blue-300 mb-2 border-b border-white/10 pb-1">{date}</div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400">Entrada:</span>
                        <span className="font-medium">{entry?.time || '--:--'}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400">Salida:</span>
                        <span className="font-medium">{exit?.time || '--:--'}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                        <span className="text-gray-400">Horas ef:</span>
                        <span className="font-bold text-emerald-400">{effective_hours.toFixed(2)}h</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1A2B48] rotate-45"></div>
                </div>
            </div>
        </td>
    );
};


const WeeklyAttendanceView = () => {
    // Current date inside the selected week
    const [baseDate, setBaseDate] = useState(() => new Date().toISOString().split('T')[0]);
    const weekDates = useMemo(() => getWeekRange(baseDate), [baseDate]);

    const [weeklyData, setWeeklyData] = useState([]); // [{ employee: {}, days: { 'yyyy-mm-dd': dayData } }]
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25); // smaller page size to prevent very long loading times
    const [totalCount, setTotalCount] = useState(0);
    const [branch, setBranch] = useState('');
    const [search, setSearch] = useState('');

    const { data: branches = [] } = useBranches();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Para la vista semanal, hacemos 7 peticiones concurrentes para cada día de la semana.
            // Gracias al orden deterministico en backend (last_name, first_name), 
            // la misma página retornará a los mismos empleados en el mismo orden todos los días.
            const promises = weekDates.map(date =>
                attendanceService.getDailyAttendance(date, {
                    branch: branch || undefined,
                    search: search || undefined,
                    page,
                    page_size: pageSize
                }).catch(err => {
                    console.warn(`Error fetching ${date}:`, err);
                    return { count: 0, results: [] };
                })
            );

            const responses = await Promise.all(promises);

            // Verify they all returned successfully
            if (!responses[0] || responses[0].results === undefined) {
                throw new Error("Respuesta inválida del servidor");
            }

            // Total count should be the same on all days
            setTotalCount(responses[0].count || 0);

            // Unificar por empleado
            // Build a map: emp_id -> { employee: {...}, days: { "2023-10-01": dataObj } }
            const employeeMap = new Map();
            const employeeOrderList = []; // Array maintaining sort order

            // Process Monday (index 0) to initialize the structure and order
            responses[0].results.forEach(dayRow => {
                const empInfo = dayRow.employee;
                if (!employeeMap.has(empInfo.id)) {
                    employeeMap.set(empInfo.id, { employee: empInfo, schedule_name: dayRow.schedule_name, days: {} });
                    employeeOrderList.push(empInfo.id);
                }
                employeeMap.get(empInfo.id).days[weekDates[0]] = dayRow;
            });

            // Process rest of the week (index 1 to 6)
            for (let i = 1; i < 7; i++) {
                const results = responses[i].results || [];
                results.forEach(dayRow => {
                    const empInfo = dayRow.employee;
                    if (employeeMap.has(empInfo.id)) {
                        employeeMap.get(empInfo.id).days[weekDates[i]] = dayRow;
                    }
                    // if employee is missing on Monday but exists on Tuesday, we ignore them on this page
                    // to keep the frontend logic clean, but due to stable deterministic ordering they should exactly match!
                });
            }

            // Construct array
            const finalData = employeeOrderList.map(id => employeeMap.get(id));
            setWeeklyData(finalData);

        } catch (err) {
            console.error('Error loading weekly attendance:', err);
            setError('Error al cargar datos de asistencia semanal');
            setWeeklyData([]);
        } finally {
            setLoading(false);
        }
    }, [weekDates, branch, search, page, pageSize]);

    useEffect(() => {
        const timer = setTimeout(() => { loadData(); }, search ? 400 : 0);
        return () => clearTimeout(timer);
    }, [loadData, search]);

    useEffect(() => {
        setPage(1);
    }, [baseDate, branch, search]);

    const changeWeek = (deltaWeeks) => {
        const d = new Date(baseDate + 'T12:00:00');
        d.setDate(d.getDate() + (deltaWeeks * 7));
        setBaseDate(d.toISOString().split('T')[0]);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= Math.ceil(totalCount / pageSize)) {
            setPage(newPage);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Week Navigator */}
                    <div className="flex items-center gap-1 bg-nominix-smoke border border-gray-100 rounded-xl p-1">
                        <button onClick={() => changeWeek(-1)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-nominix-dark transition-colors" title="Semana anterior">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-2 px-3">
                            <Calendar size={14} className="text-nominix-electric" />
                            <span className="text-[11px] font-bold text-nominix-dark tracking-wide">
                                {weekDates[0]} <span className="text-gray-400 font-normal mx-1">al</span> {weekDates[6]}
                            </span>
                        </div>
                        <button onClick={() => changeWeek(1)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-nominix-dark transition-colors" title="Semana siguiente">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Sede */}
                    <div className="w-56">
                        <SelectField
                            value={branch} onChange={(e) => setBranch(e.target.value)}
                            options={[{ value: '', label: 'Todas las Sedes' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                            icon={Building2} placeholder="Filtrar Sede" className="!py-1.5 !text-xs"
                        />
                    </div>

                    {/* Búsqueda */}
                    <div className="w-64">
                        <InputField
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar Colaborador..." icon={Search} className="!py-1.5 !text-xs"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-nominix-electric text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Hint */}
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                <Info size={14} className="text-blue-500 flex-shrink-0" />
                Los valores numéricos representan las <strong className="text-nominix-dark mx-1">Horas Efectivas</strong> calculadas. Haz hover sobre cada recuadro para ver las horas exactas de entrada y salida reales.
            </div>

            {/* Error */}
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Table */}
            <Card className="border-0">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center py-20 text-gray-400 gap-2.5">
                            <Loader2 size={24} className="animate-spin" />
                            <span className="text-sm font-medium">Calculando horas semanales...</span>
                        </div>
                    ) : weeklyData.length === 0 ? (
                        <div className="flex flex-col justify-center items-center py-20 text-gray-400 gap-3">
                            <Users size={40} strokeWidth={1} className="text-gray-300" />
                            <span className="text-sm font-medium text-gray-500">No hay datos para esta semana</span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/30">
                                            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 rounded-tl-xl sticky left-0 bg-white/95 backdrop-blur z-10">Colaborador</th>
                                            {weekDates.map((date, idx) => (
                                                <th key={date} className="px-3 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-nominix-dark mb-0.5">{dayNames[idx]}</span>
                                                        <span className="text-[9px] font-medium text-gray-400">{date.split('-').slice(1).join('/')}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-5 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-nominix-electric bg-blue-50/30">Total Sem.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeklyData.map((row, idx) => {
                                            const { employee, days } = row;
                                            const getInitials = name => name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??';

                                            // Calculate total hours for the week
                                            const weeklyHours = weekDates.reduce((sum, date) => {
                                                const d = days[date];
                                                return sum + (d?.effective_hours || 0);
                                            }, 0);

                                            return (
                                                <tr key={employee.id} className={`border-b border-gray-50 hover:bg-nominix-smoke/60 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                                                    {/* User Info (Sticky left) */}
                                                    <td className="px-5 py-4 sticky left-0 bg-white/95 backdrop-blur z-10" style={{ minWidth: '240px' }}>
                                                        <div className="flex items-center gap-3">
                                                            {employee.photo_url ? (
                                                                <img src={employee.photo_url} alt={employee.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-transparent" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-blue-50 text-blue-600 border border-blue-100">
                                                                    {getInitials(employee.name)}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-bold text-nominix-dark truncate">{employee.name}</div>
                                                                <div className="text-[11px] text-gray-400 truncate">{employee.department || row.schedule_name || 'Sin departamento'}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Days (Mon - Sun) */}
                                                    {weekDates.map((date) => (
                                                        <WeekCell key={date} date={date} dayData={days[date]} />
                                                    ))}

                                                    {/* Row Summary */}
                                                    <td className="px-5 py-3 text-center bg-blue-50/10 border-l border-blue-50/50">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-lg font-black text-nominix-electric tracking-tight">{weeklyHours.toFixed(1)}</span>
                                                            <span className="text-[9px] font-semibold text-gray-400">h / sem</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                                <div className="text-xs text-gray-400 font-medium">
                                    Mostrando {weeklyData.length} de {totalCount} colaboradores
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-nominix-dark disabled:opacity-30 disabled:hover:bg-transparent">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-bold text-gray-600">
                                        Página {page} de {totalPages}
                                    </span>
                                    <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-nominix-dark disabled:opacity-30 disabled:hover:bg-transparent">
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

export default WeeklyAttendanceView;
