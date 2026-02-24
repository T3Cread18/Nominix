import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2, Files, Calculator } from 'lucide-react';
import declarationsService from '../../services/declarations.service';
import payrollService from '../../services/payroll.service';
import axiosClient from '../../api/axiosClient';

/**
 * ReportsPanel — Centro de reportes y descargas.
 *
 * Secciones:
 * 1. Constancia de Trabajo (por empleado)
 * 2. Resumen de Nómina (Excel por periodo)
 */
export default function ReportsPanel() {
    const [periods, setPeriods] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [showSalary, setShowSalary] = useState(true);
    const [selectedPeriodBatch, setSelectedPeriodBatch] = useState('');
    const [selectedBatchType, setSelectedBatchType] = useState('todos');
    const [contracts, setContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState('');
    const [terminationDate, setTerminationDate] = useState('');
    const [loading, setLoading] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [periodsData, employeesRes, contractsRes] = await Promise.all([
                payrollService.getPeriods(),
                axiosClient.get('/employees/?is_active=true&page_size=200').then(r => r.data.results || r.data),
                axiosClient.get('/contracts/?is_active=true&page_size=200').then(r => r.data.results || r.data),
            ]);
            setPeriods(Array.isArray(periodsData) ? periodsData : []);
            setEmployees(Array.isArray(employeesRes) ? employeesRes : []);
            setContracts(Array.isArray(contractsRes) ? contractsRes : []);
        } catch (err) {
            console.error('Error cargando datos:', err);
        }
    };

    const handleDownload = async (key, fn) => {
        setLoading(prev => ({ ...prev, [key]: true }));
        try {
            await fn();
        } catch (err) {
            console.error(`Error en descarga ${key}:`, err);
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    return (
        <div className="min-h-screen bg-nominix-smoke">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 lg:px-10">
                    <div className="py-6">
                        <h1 className="text-2xl font-black text-nominix-dark flex items-center gap-3">
                            <div className="p-2 bg-nominix-electric/10 rounded-xl">
                                <FileText className="text-nominix-electric" size={24} />
                            </div>
                            Centro de Reportes
                        </h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-12">
                            Generación de documentos PDF y Excel
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Constancia de Trabajo */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-violet-50 rounded-xl">
                                <FileText className="text-violet-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-nominix-dark font-bold">Constancia de Trabajo</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Documento PDF</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 font-medium mb-1">Empleado</label>
                                <select
                                    value={selectedEmployee}
                                    onChange={e => setSelectedEmployee(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20"
                                >
                                    <option value="">Seleccionar empleado...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.national_id} — {emp.first_name} {emp.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-nominix-dark cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showSalary}
                                    onChange={e => setShowSalary(e.target.checked)}
                                    className="rounded border-gray-300 text-nominix-electric focus:ring-nominix-electric"
                                />
                                Incluir salario
                            </label>

                            <button
                                onClick={() => handleDownload('constancia', () =>
                                    declarationsService.downloadConstanciaTrabajo(selectedEmployee, showSalary)
                                )}
                                disabled={!selectedEmployee || loading.constancia}
                                className="w-full flex items-center justify-center gap-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 border border-violet-200 rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                {loading.constancia ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                {loading.constancia ? 'Generando...' : 'Generar PDF'}
                            </button>
                        </div>
                    </div>

                    {/* Reporte Excel de Nómina */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <FileSpreadsheet className="text-emerald-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-nominix-dark font-bold">Resumen de Nómina</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Excel con detalle completo</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 font-medium mb-1">Periodo</label>
                                <select
                                    value={selectedPeriod}
                                    onChange={e => setSelectedPeriod(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20"
                                >
                                    <option value="">Seleccionar periodo...</option>
                                    {periods.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name || `${p.start_date} — ${p.end_date}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-nominix-smoke rounded-xl p-3 text-xs text-gray-500">
                                <p className="font-bold text-nominix-dark mb-1">El reporte incluye:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>Hoja 1: Detalle por empleado (cédula, asignaciones, deducciones, neto)</li>
                                    <li>Hoja 2: Resumen por departamento</li>
                                    <li>Hoja 3: Resumen por concepto</li>
                                </ul>
                            </div>

                            <button
                                onClick={() => handleDownload('excel', () =>
                                    declarationsService.downloadPayrollExcel(selectedPeriod)
                                )}
                                disabled={!selectedPeriod || loading.excel}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-200 rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                {loading.excel ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                {loading.excel ? 'Generando...' : 'Descargar Excel'}
                            </button>
                        </div>
                    </div>

                    {/* Recibos de Pago por Lote (Lote PDF) */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <Files className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-nominix-dark font-bold">Recibos de Pago por Lote</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Documento PDF Masivo</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 font-medium mb-1">Periodo</label>
                                <select
                                    value={selectedPeriodBatch}
                                    onChange={e => setSelectedPeriodBatch(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20"
                                >
                                    <option value="">Seleccionar periodo...</option>
                                    {periods.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name || `${p.start_date} — ${p.end_date}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 font-medium mb-1">Tipo de Recibo</label>
                                <select
                                    value={selectedBatchType}
                                    onChange={e => setSelectedBatchType(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20"
                                >
                                    <option value="todos">Todos los conceptos</option>
                                    <option value="salario">Solo Salario (Nómina Regular)</option>
                                    <option value="complemento">Solo Complemento</option>
                                    <option value="cestaticket">Solo Cesta Ticket</option>
                                </select>
                            </div>

                            <button
                                onClick={() => handleDownload('batch_pdf', () =>
                                    declarationsService.downloadPayrollReceiptsBatch(selectedPeriodBatch, selectedBatchType)
                                )}
                                disabled={!selectedPeriodBatch || loading.batch_pdf}
                                className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-200 rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                {loading.batch_pdf ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                {loading.batch_pdf ? 'Generando...' : 'Generar Lote PDF'}
                            </button>
                        </div>
                    </div>

                    {/* Simulación de Liquidación */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-50 rounded-xl">
                                <Calculator className="text-orange-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-nominix-dark font-bold">Simulación de Liquidación</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cuadro Comparativo Legal (PDF)</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 font-medium mb-1">Contrato del Empleado</label>
                                <select
                                    value={selectedContract}
                                    onChange={e => setSelectedContract(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20"
                                >
                                    <option value="">Seleccionar contrato...</option>
                                    {contracts.map(c => {
                                        const emp = employees.find(e => e.id === c.employee);
                                        const empName = emp ? `${emp.national_id} — ${emp.first_name} ${emp.last_name}` : `Empleado ID ${c.employee}`;
                                        return (
                                            <option key={c.id} value={c.id}>
                                                {empName} ({c.position})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 font-medium mb-1">Fecha Estimada de Egreso (Opcional)</label>
                                <input
                                    type="date"
                                    value={terminationDate}
                                    onChange={e => setTerminationDate(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Si se deja vacío, se simulará con la fecha de hoy.</p>
                            </div>

                            <button
                                onClick={() => handleDownload('simulation', () =>
                                    declarationsService.downloadSimulationSettlementPdf(selectedContract, terminationDate)
                                )}
                                disabled={!selectedContract || loading.simulation}
                                className="w-full mt-2 flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-200 rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                {loading.simulation ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                {loading.simulation ? 'Generando...' : 'Generar Cuadro (PDF)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
