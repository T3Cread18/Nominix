import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, CheckCheck, Clock, XCircle, Loader2, ChevronDown, Save, ClipboardCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui';
import attendanceService from '../../services/attendance.service';
import axiosClient from '../../api/axiosClient';

/**
 * PeriodAttendanceView
 * 
 * Vista de asistencia agrupada por periodo de nómina.
 * Palette: nominix-dark #1A2B48, nominix-electric #0052FF, nominix-smoke #F8F9FA, surface #FFF
 * Campos editables inline cuando el estado es PENDIENTE.
 * Solo muestra periodos abiertos.
 */
const PeriodAttendanceView = () => {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [approvingId, setApprovingId] = useState(null);
    const [approvingAll, setApprovingAll] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [editedValues, setEditedValues] = useState({});
    const [savingId, setSavingId] = useState(null);

    // Load payroll periods (only open)
    useEffect(() => {
        const loadPeriods = async () => {
            try {
                const response = await axiosClient.get('/payroll-periods/');
                const data = response.data.results || response.data;
                const openPeriods = data.filter(p => p.status === 'OPEN');
                setPeriods(openPeriods);
                if (openPeriods.length > 0) {
                    setSelectedPeriodId(String(openPeriods[0].id));
                }
            } catch (err) {
                console.error('Error loading periods:', err);
            }
        };
        loadPeriods();
    }, []);

    // Load summaries when period changes
    const loadSummaries = useCallback(async () => {
        if (!selectedPeriodId) return;
        setLoading(true);
        try {
            const data = await attendanceService.getPeriodSummaries({
                period_id: selectedPeriodId,
                page_size: 200,
            });
            setSummaries(data.results || []);
            setEditedValues({});
        } catch (err) {
            console.error('Error loading summaries:', err);
            setSummaries([]);
        } finally {
            setLoading(false);
        }
    }, [selectedPeriodId]);

    useEffect(() => { loadSummaries(); }, [loadSummaries]);

    // Generate summaries
    const handleGenerate = async () => {
        if (!selectedPeriodId) { toast.error('Selecciona un periodo primero'); return; }
        setGenerating(true);
        try {
            const result = await attendanceService.generatePeriodSummaries(selectedPeriodId);
            toast.success(`Resumen generado: ${result.created} nuevos, ${result.updated} actualizados`);
            await loadSummaries();
        } catch (err) {
            toast.error('Error al generar resumen: ' + (err.response?.data?.error || err.message));
        } finally { setGenerating(false); }
    };

    // ── Inline editing ──
    const handleFieldChange = (summaryId, field, value) => {
        const numValue = value === '' ? 0 : parseInt(value, 10) || 0;
        setEditedValues(prev => ({
            ...prev,
            [summaryId]: { ...(prev[summaryId] || {}), [field]: numValue }
        }));
    };

    const getFieldValue = (summary, field) => {
        if (editedValues[summary.id]?.[field] !== undefined) return editedValues[summary.id][field];
        return Math.round(parseFloat(summary[field] || 0));
    };

    const hasEdits = (summaryId) => editedValues[summaryId] && Object.keys(editedValues[summaryId]).length > 0;

    const saveEdits = async (summaryId) => {
        const edits = editedValues[summaryId];
        if (!edits) return;
        setSavingId(summaryId);
        try {
            await attendanceService.updatePeriodSummary(summaryId, edits);
            toast.success('Valores actualizados');
            setEditedValues(prev => { const c = { ...prev }; delete c[summaryId]; return c; });
            await loadSummaries();
        } catch (err) {
            toast.error('Error al guardar: ' + (err.response?.data?.error || err.response?.data?.detail || err.message));
        } finally { setSavingId(null); }
    };

    // Approve single
    const handleApprove = async (summaryId) => {
        if (hasEdits(summaryId)) await saveEdits(summaryId);
        setApprovingId(summaryId);
        try {
            await attendanceService.approvePeriodSummary(summaryId);
            toast.success('Resumen aprobado. Novedades creadas en la nómina.');
            await loadSummaries();
        } catch (err) {
            toast.error('Error al aprobar: ' + (err.response?.data?.error || err.message));
        } finally { setApprovingId(null); }
    };

    // Approve all
    const handleApproveAll = async () => {
        if (!selectedPeriodId) return;
        for (const id of Object.keys(editedValues)) { await saveEdits(parseInt(id)); }
        setApprovingAll(true);
        try {
            const result = await attendanceService.approveAllPeriodSummaries(selectedPeriodId);
            toast.success(`${result.approved} resúmenes aprobados. Novedades inyectadas.`);
            await loadSummaries();
        } catch (err) {
            toast.error('Error al aprobar todos: ' + (err.response?.data?.error || err.message));
        } finally { setApprovingAll(false); }
    };

    // Totals
    const totals = summaries.reduce((acc, s) => ({
        total_hours: acc.total_hours + getFieldValue(s, 'total_hours'),
        regular_day_hours: acc.regular_day_hours + getFieldValue(s, 'regular_day_hours'),
        night_hours: acc.night_hours + getFieldValue(s, 'night_hours'),
        overtime_day_hours: acc.overtime_day_hours + getFieldValue(s, 'overtime_day_hours'),
        overtime_night_hours: acc.overtime_night_hours + getFieldValue(s, 'overtime_night_hours'),
        sunday_count: acc.sunday_count + getFieldValue(s, 'sunday_count'),
        absences: acc.absences + (s.absences || 0),
        days_worked: acc.days_worked + (s.days_worked || 0),
    }), {
        total_hours: 0, regular_day_hours: 0, night_hours: 0,
        overtime_day_hours: 0, overtime_night_hours: 0,
        sunday_count: 0, absences: 0, days_worked: 0,
    });

    const pendingCount = summaries.filter(s => s.status === 'PENDING').length;
    const selectedPeriod = periods.find(p => String(p.id) === selectedPeriodId);

    // Editable cell
    const EditableCell = ({ summary, field, colorClass = 'text-nominix-dark' }) => {
        const isPending = summary.status === 'PENDING';
        const value = getFieldValue(summary, field);
        const isEdited = editedValues[summary.id]?.[field] !== undefined;

        if (!isPending) {
            return <span className={`text-sm font-bold ${colorClass}`}>{value}</span>;
        }

        return (
            <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => handleFieldChange(summary.id, field, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={`w-14 text-center bg-white border rounded-lg px-1 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${isEdited
                        ? 'border-blue-400 text-blue-600 ring-1 ring-blue-200'
                        : 'border-gray-200 ' + colorClass
                    }`}
            />
        );
    };

    const StatusBadge = ({ status }) => {
        const map = {
            PENDING: { icon: Clock, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', label: 'Pendiente' },
            APPROVED: { icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', label: 'Aprobado' },
            REJECTED: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', label: 'Rechazado' },
        };
        const cfg = map[status] || map.PENDING;
        const Icon = cfg.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                <Icon size={12} />
                {cfg.label}
            </span>
        );
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Period Selector */}
                    <div className="flex items-center gap-2 bg-nominix-smoke border border-gray-100 rounded-xl px-3 py-2">
                        <ClipboardCheck size={14} className="text-nominix-electric" />
                        <select
                            value={selectedPeriodId}
                            onChange={(e) => setSelectedPeriodId(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-nominix-dark cursor-pointer outline-none min-w-[200px]"
                        >
                            <option value="">Seleccionar periodo...</option>
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={generating || !selectedPeriodId}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-nominix-electric text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                    >
                        {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {generating ? 'Generando...' : 'Generar Resumen'}
                    </button>
                </div>

                {pendingCount > 0 && (
                    <button
                        onClick={handleApproveAll}
                        disabled={approvingAll}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                        {approvingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                        Aprobar Todos ({pendingCount})
                    </button>
                )}
            </div>

            {/* Period Info Bar */}
            {selectedPeriod && (
                <div className="flex items-center gap-4 text-xs font-medium text-gray-500 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                    <span>Desde: <strong className="text-nominix-dark">{selectedPeriod.start_date}</strong></span>
                    <span>Hasta: <strong className="text-nominix-dark">{selectedPeriod.end_date}</strong></span>
                    <span>Pago: <strong className="text-nominix-dark">{selectedPeriod.payment_date}</strong></span>
                </div>
            )}

            {/* KPI Cards */}
            {summaries.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiCard label="Empleados" value={summaries.length} bgColor="#f0f4ff" borderColor="#dbe4ff" iconColor="#0052FF" />
                    <KpiCard label="Pendientes" value={pendingCount} bgColor="#fffbeb" borderColor="#fde68a" iconColor="#d97706" />
                    <KpiCard label="Aprobados" value={summaries.filter(s => s.status === 'APPROVED').length} bgColor="#ecfdf5" borderColor="#a7f3d0" iconColor="#059669" />
                    <KpiCard label="Total Horas" value={totals.total_hours} bgColor="#f0f4ff" borderColor="#dbe4ff" iconColor="#0052FF" />
                </div>
            )}

            {/* Main Table */}
            <Card className="border-0">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center py-16 text-gray-400 gap-2.5">
                            <Loader2 size={24} className="animate-spin" />
                            <span className="text-sm font-medium">Cargando resúmenes...</span>
                        </div>
                    ) : summaries.length === 0 ? (
                        <div className="flex flex-col justify-center items-center py-16 text-gray-400 gap-3">
                            <Users size={40} strokeWidth={1} className="text-gray-300" />
                            <span className="text-sm font-medium text-gray-500">
                                {selectedPeriodId ? 'No hay resúmenes. Haz clic en "Generar Resumen" para calcular.' : 'Selecciona un periodo para comenzar.'}
                            </span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 sticky left-0 bg-white/95 backdrop-blur z-10">Colaborador</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Días</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Ausencias</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">H. Total</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">H. Diurnas</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">H. Noct.</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-nominix-electric bg-blue-50/30">HE Diur.</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-nominix-electric bg-blue-50/30">HE Noct.</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Dom.</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Estado</th>
                                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaries.map((s, idx) => {
                                        const getInitials = (name) => name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??';

                                        return (
                                            <React.Fragment key={s.id}>
                                                <tr
                                                    className={`border-b border-gray-50 hover:bg-nominix-smoke/60 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                                                    onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                                                >
                                                    {/* Employee */}
                                                    <td className="px-4 py-3 sticky left-0 bg-white/95 backdrop-blur z-10" style={{ minWidth: '220px' }}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-blue-50 text-blue-600 border border-blue-100">
                                                                {getInitials(s.employee_name)}
                                                            </div>
                                                            <div className="min-w-0 flex items-center gap-2">
                                                                <ChevronDown
                                                                    size={12}
                                                                    className={`text-gray-300 transition-transform flex-shrink-0 ${expandedRow === s.id ? 'rotate-180' : ''}`}
                                                                />
                                                                <div>
                                                                    <div className="text-sm font-bold text-nominix-dark truncate" style={{ maxWidth: '180px' }}>{s.employee_name}</div>
                                                                    <div className="text-[11px] text-gray-400">{s.employee_cedula} · {s.department}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-3 text-center text-sm font-bold text-nominix-dark">{s.days_worked}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`text-sm font-bold ${s.absences > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                                            {s.absences}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <EditableCell summary={s} field="total_hours" colorClass="text-nominix-dark" />
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <EditableCell summary={s} field="regular_day_hours" colorClass="text-nominix-dark" />
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <EditableCell summary={s} field="night_hours" colorClass="text-indigo-600" />
                                                    </td>
                                                    <td className="px-3 py-3 text-center bg-blue-50/10">
                                                        <EditableCell summary={s} field="overtime_day_hours" colorClass="text-nominix-electric" />
                                                    </td>
                                                    <td className="px-3 py-3 text-center bg-blue-50/10">
                                                        <EditableCell summary={s} field="overtime_night_hours" colorClass="text-nominix-electric" />
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <EditableCell summary={s} field="sunday_count" colorClass="text-purple-600" />
                                                    </td>
                                                    <td className="px-3 py-3 text-center"><StatusBadge status={s.status} /></td>
                                                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        {s.status === 'PENDING' ? (
                                                            <div className="flex items-center gap-1 justify-center">
                                                                {hasEdits(s.id) && (
                                                                    <button
                                                                        onClick={() => saveEdits(s.id)}
                                                                        disabled={savingId === s.id}
                                                                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-500 hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                                        title="Guardar cambios"
                                                                    >
                                                                        {savingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleApprove(s.id)}
                                                                    disabled={approvingId === s.id}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                                                >
                                                                    {approvingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                                    Aprobar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded detail */}
                                                {expandedRow === s.id && s.detail_json && (
                                                    <tr>
                                                        <td colSpan={11} className="px-4 py-3 bg-nominix-smoke/60 border-b border-gray-100">
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Desglose diario</div>
                                                            <div className="grid grid-cols-7 gap-1.5 max-w-4xl">
                                                                {(Array.isArray(s.detail_json) ? s.detail_json : []).map((day, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className={`p-2 rounded-xl text-center text-xs border ${!day.has_marks
                                                                                ? 'bg-red-50 border-red-100 text-red-400'
                                                                                : day.is_sunday
                                                                                    ? 'bg-purple-50 border-purple-100 text-purple-500'
                                                                                    : 'bg-white border-gray-100 text-gray-600'
                                                                            }`}
                                                                        title={`${day.date}: ${day.effective_hours}h ${day.is_sunday ? '(Dom)' : ''}`}
                                                                    >
                                                                        <div className="font-bold text-[10px]">{new Date(day.date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' }).toUpperCase()}</div>
                                                                        <div className="text-[9px] text-gray-400">{day.date?.slice(5)}</div>
                                                                        <div className="mt-1 font-black text-[13px]">{day.has_marks ? `${day.effective_hours}` : '—'}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {s.approved_by_name && (
                                                                <div className="text-[11px] text-gray-400 mt-2 font-medium">
                                                                    Aprobado por: <strong className="text-nominix-dark">{s.approved_by_name}</strong> · {s.approved_at ? new Date(s.approved_at).toLocaleString('es') : ''}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}

                                    {/* Totals */}
                                    <tr className="border-t-2 border-gray-200 bg-nominix-smoke">
                                        <td className="px-4 py-3 sticky left-0 bg-nominix-smoke z-10">
                                            <span className="text-xs font-bold uppercase tracking-widest text-nominix-dark">
                                                Totales ({summaries.length})
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-nominix-dark">{totals.days_worked}</td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-red-500">{totals.absences}</td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-nominix-dark">{totals.total_hours}</td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-nominix-dark">{totals.regular_day_hours}</td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-indigo-600">{totals.night_hours}</td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-nominix-electric bg-blue-50/30">{totals.overtime_day_hours}</td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-nominix-electric bg-blue-50/30">{totals.overtime_night_hours}</td>
                                        <td className="px-3 py-3 text-center text-sm font-black text-purple-600">{totals.sunday_count}</td>
                                        <td className="px-3 py-3 text-center text-[11px] font-bold text-amber-600">{pendingCount} pend.</td>
                                        <td className="px-3 py-3 text-center text-gray-300">—</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// ─── KPI Card ──────────────────────────────────
const KpiCard = ({ label, value, bgColor, borderColor, iconColor }) => (
    <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    }}>
        <div>
            <div className="text-xl font-black text-nominix-dark leading-none tracking-tight">
                {value}
            </div>
            <div className="text-[11px] font-semibold" style={{ color: iconColor }}>
                {label}
            </div>
        </div>
    </div>
);

export default PeriodAttendanceView;
