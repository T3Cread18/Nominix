import React, { useState } from 'react';
import { FileText, Calculator, Download, CheckCircle, AlertCircle, Loader2, Shield, GraduationCap } from 'lucide-react';
import declarationsService from '../../services/declarations.service';

/**
 * DeclarationsPanel — Panel unificado de declaraciones gubernamentales.
 *
 * Soporta:
 * - LPPSS (Pensiones 9%) — mensual
 * - INCES (Patronal 2%) — trimestral
 * - Exportación de archivos planos (IVSS, FAOV, ISLR)
 */
export default function DeclarationsPanel() {
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [month, setMonth] = useState(() => new Date().getMonth() + 1);
    const [quarter, setQuarter] = useState(() => Math.ceil((new Date().getMonth() + 1) / 3));
    const [loading, setLoading] = useState({});
    const [results, setResults] = useState({});
    const [errors, setErrors] = useState({});

    const setLoadingFor = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));
    const setResultFor = (key, val) => setResults(prev => ({ ...prev, [key]: val }));
    const setErrorFor = (key, val) => setErrors(prev => ({ ...prev, [key]: val }));

    const handleAction = async (key, fn) => {
        setLoadingFor(key, true);
        setErrorFor(key, null);
        setResultFor(key, null);
        try {
            const result = await fn();
            setResultFor(key, result);
        } catch (err) {
            setErrorFor(key, err?.response?.data?.error || err.message || 'Error desconocido');
        } finally {
            setLoadingFor(key, false);
        }
    };

    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
        <div className="min-h-screen bg-nominix-smoke">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 lg:px-10">
                    <div className="flex items-center justify-between py-6">
                        <div>
                            <h1 className="text-2xl font-black text-nominix-dark flex items-center gap-3">
                                <div className="p-2 bg-nominix-electric/10 rounded-xl">
                                    <Shield className="text-nominix-electric" size={24} />
                                </div>
                                Declaraciones Gubernamentales
                            </h1>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-12">
                                LPPSS · INCES · IVSS · FAOV · ISLR
                            </p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <select value={year} onChange={e => setYear(+e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm font-medium focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20">
                                {[2024, 2025, 2026, 2027].map(y =>
                                    <option key={y} value={y}>{y}</option>
                                )}
                            </select>
                            <select value={month} onChange={e => setMonth(+e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm font-medium focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20">
                                {MONTHS.map((m, i) =>
                                    <option key={i + 1} value={i + 1}>{m}</option>
                                )}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                    {/* LPPSS Card */}
                    <DeclarationCard
                        icon={<Shield className="text-amber-500" size={24} />}
                        title="LPPSS — Pensiones 9%"
                        subtitle="Contribución Especial Mensual"
                        description="Calcula la contribución del 9% sobre salarios + bonificaciones con piso IMII por trabajador."
                        actionLabel="Calcular LPPSS"
                        accentColor="amber"
                        loading={loading.lppss}
                        error={errors.lppss}
                        result={results.lppss}
                        onAction={() => handleAction('lppss', () => declarationsService.calculateLPPSS(year, month))}
                        renderResult={(r) => (
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Empleados:</span><span className="font-bold text-nominix-dark">{r.total_employees}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Base:</span><span className="font-bold text-nominix-dark">Bs. {Number(r.total_payroll_base_ves).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between font-bold"><span className="text-amber-600">Contribución:</span><span className="text-amber-600">Bs. {Number(r.contribution_amount_ves).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                        )}
                    />

                    {/* INCES Card */}
                    <DeclarationCard
                        icon={<GraduationCap className="text-nominix-electric" size={24} />}
                        title="INCES — Patronal 2%"
                        subtitle="Contribución Trimestral"
                        description="2% sobre la nómina total del trimestre. Declaración trimestral."
                        actionLabel="Calcular INCES"
                        accentColor="blue"
                        loading={loading.inces}
                        error={errors.inces}
                        result={results.inces}
                        extraControls={
                            <select value={quarter} onChange={e => setQuarter(+e.target.value)}
                                className="bg-white border border-gray-200 rounded px-2 py-1 text-nominix-dark text-xs font-medium">
                                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                            </select>
                        }
                        onAction={() => handleAction('inces', () => declarationsService.calculateINCES(year, quarter))}
                        renderResult={(r) => (
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Nómina Trimestre:</span><span className="font-bold text-nominix-dark">Bs. {Number(r.total_payroll_ves).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between font-bold"><span className="text-nominix-electric">Contribución:</span><span className="text-nominix-electric">Bs. {Number(r.employer_contribution_ves).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                        )}
                    />

                    {/* Exports Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <Download className="text-emerald-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-nominix-dark font-bold">Archivos Planos</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Exportar para portales</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <ExportButton
                                label="TXT IVSS — Ingresos"
                                loading={loading.ivss_ing}
                                onClick={() => handleAction('ivss_ing', () => declarationsService.downloadIVSS('INGRESO'))}
                            />
                            <ExportButton
                                label="TXT IVSS — Egresos"
                                loading={loading.ivss_egr}
                                onClick={() => handleAction('ivss_egr', () => declarationsService.downloadIVSS('EGRESO'))}
                            />
                            <ExportButton
                                label="TXT IVSS — Cambio Salario"
                                loading={loading.ivss_sal}
                                onClick={() => handleAction('ivss_sal', () => declarationsService.downloadIVSS('CAMBIO_SALARIO'))}
                            />
                            <ExportButton
                                label="TXT FAOV — Banavih"
                                loading={loading.faov}
                                onClick={() => handleAction('faov', () => declarationsService.downloadFAOV(year, month))}
                            />
                            <ExportButton
                                label="XML ISLR — SENIAT"
                                loading={loading.islr}
                                onClick={() => handleAction('islr', () => declarationsService.downloadISLRXML(year, month))}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================
// Sub-Components
// =====================

function DeclarationCard({ icon, title, subtitle, description, actionLabel, accentColor, loading, error, result, onAction, renderResult, extraControls }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${accentColor === 'amber' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-nominix-dark font-bold">{title}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{subtitle}</p>
                    </div>
                </div>
                {extraControls}
            </div>

            <p className="text-sm text-gray-500 mb-4">{description}</p>

            <button
                onClick={onAction}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-nominix-electric/10 hover:bg-nominix-electric/20 text-nominix-electric border border-nominix-electric/20 rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}
                {loading ? 'Calculando...' : actionLabel}
            </button>

            {error && (
                <div className="mt-3 flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3 border border-red-100">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {result && (
                <div className="mt-3 bg-nominix-smoke rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Calculado</span>
                    </div>
                    {renderResult(result)}
                </div>
            )}
        </div>
    );
}

function ExportButton({ label, loading, onClick }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="w-full flex items-center justify-between bg-nominix-smoke hover:bg-gray-100 text-nominix-dark rounded-xl py-2.5 px-3 text-sm transition-colors disabled:opacity-50"
        >
            <span className="flex items-center gap-2">
                <FileText size={14} className="text-emerald-600" />
                {label}
            </span>
            {loading ? <Loader2 className="animate-spin text-gray-400" size={14} /> : <Download size={14} className="text-gray-400" />}
        </button>
    );
}
