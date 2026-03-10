import React, { useState } from 'react';
import { X, Download, Loader2, FileText, Users, User } from 'lucide-react';
import { Modal } from '../../components/ui';
import payrollService from '../../services/payroll.service';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

/**
 * ARCExportModal — Genera el Comprobante de Retención ISLR (Forma AR-C).
 *
 * Props:
 *   isOpen, onClose
 *   employees: [{ id, full_name, national_id }] — lista de empleados activos
 */
const ARCExportModal = ({ isOpen, onClose, employees = [] }) => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(String(currentYear - 1));
    const [mode, setMode] = useState('batch'); // 'batch' | 'individual'
    const [employeeId, setEmployeeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const filteredEmployees = employees.filter(e =>
        `${e.full_name} ${e.national_id}`.toLowerCase().includes(search.toLowerCase())
    );

    const selectedEmployee = employees.find(e => String(e.id) === String(employeeId));

    const handleDownload = async () => {
        if (mode === 'individual' && !employeeId) {
            toast.error('Seleccione un empleado para generar el ARC individual.');
            return;
        }
        setLoading(true);
        try {
            if (mode === 'individual') {
                await payrollService.downloadARC(
                    Number(year),
                    Number(employeeId),
                    selectedEmployee?.full_name?.replace(/\s+/g, '_') || employeeId
                );
                toast.success(`ARC ${year} generado para ${selectedEmployee?.full_name}`);
            } else {
                await payrollService.downloadARC(Number(year));
                toast.success(`ARC ${year} — lote completo generado`);
            }
            onClose();
        } catch (err) {
            const msg = err.response?.data?.error || 'No se pudo generar el comprobante ARC.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const yearOptions = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
        yearOptions.push(y);
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Comprobante de Retención ISLR"
            description="Forma AR-C — Decreto N° 1.808, Art. 23"
            size="md"
        >
            <div className="space-y-6">

                {/* Año fiscal */}
                <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 pl-3 mb-1.5 block tracking-widest">
                        Ejercicio Fiscal
                    </label>
                    <select
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl font-bold text-sm text-nominix-dark outline-none focus:border-nominix-electric focus:bg-white transition-all"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Modo: lote o individual */}
                <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 pl-3 mb-1.5 block tracking-widest">
                        Tipo de Generación
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setMode('batch')}
                            className={cn(
                                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                                mode === 'batch'
                                    ? 'border-nominix-electric bg-nominix-electric/5 text-nominix-electric'
                                    : 'border-gray-100 bg-slate-50 text-gray-400 hover:border-gray-200'
                            )}
                        >
                            <Users size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                Todos los Empleados
                            </span>
                            <span className="text-[9px] font-medium text-center leading-tight opacity-70">
                                Un PDF con todos los ARC
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('individual')}
                            className={cn(
                                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                                mode === 'individual'
                                    ? 'border-nominix-electric bg-nominix-electric/5 text-nominix-electric'
                                    : 'border-gray-100 bg-slate-50 text-gray-400 hover:border-gray-200'
                            )}
                        >
                            <User size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                Empleado Individual
                            </span>
                            <span className="text-[9px] font-medium text-center leading-tight opacity-70">
                                ARC de un colaborador
                            </span>
                        </button>
                    </div>
                </div>

                {/* Selector de empleado (solo individual) */}
                {mode === 'individual' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="text-[9px] font-black uppercase text-gray-400 pl-3 block tracking-widest">
                            Colaborador
                        </label>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-nominix-electric focus:bg-white transition-colors"
                        />
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                            {filteredEmployees.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 font-bold py-4">
                                    No se encontraron colaboradores
                                </p>
                            ) : (
                                filteredEmployees.map(emp => (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => { setEmployeeId(String(emp.id)); setSearch(''); }}
                                        className={cn(
                                            'w-full text-left px-4 py-3 transition-colors',
                                            String(employeeId) === String(emp.id)
                                                ? 'bg-nominix-electric text-white'
                                                : 'hover:bg-slate-50'
                                        )}
                                    >
                                        <p className="text-xs font-bold">{emp.full_name}</p>
                                        <p className="text-[10px] opacity-70">{emp.national_id}</p>
                                    </button>
                                ))
                            )}
                        </div>
                        {selectedEmployee && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-100">
                                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                <span className="text-xs font-bold text-green-700">
                                    {selectedEmployee.full_name} — {selectedEmployee.national_id}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Info */}
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[9px] text-blue-600 font-bold leading-relaxed">
                        El comprobante AR-C incluye el desglose mensual de remuneraciones pagadas
                        e ISLR retenido durante el ejercicio fiscal seleccionado. Solo se generan
                        ARCs para empleados con retenciones registradas en ese año.
                    </p>
                </div>

                {/* Botón */}
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={loading || (mode === 'individual' && !employeeId)}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-nominix-electric text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-nominix-electric/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Download size={18} />
                    )}
                    {loading
                        ? 'Generando PDF...'
                        : mode === 'batch'
                            ? `Descargar ARC Lote ${year}`
                            : `Descargar ARC ${year}`
                    }
                </button>
            </div>
        </Modal>
    );
};

export default ARCExportModal;
