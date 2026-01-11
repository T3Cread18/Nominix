import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Calculator, DollarSign, CheckCircle, AlertCircle,
    Loader2, RefreshCw, FileText, PlusCircle, Trash2, X, Save
} from 'lucide-react';

/**
 * EmployeeConcepts - Muestra conceptos fijos del contrato Y permite asignar conceptos extra.
 */
const EmployeeConcepts = ({
    employeeId,
    employeeData,
    initialAssignedConcepts,
    initialActiveContract = null,
    initialExchangeRate = 60.00,
    onRefresh,
    isLoading: parentLoading
}) => {
    const [loading, setLoading] = useState(parentLoading);
    const [activeContract, setActiveContract] = useState(initialActiveContract);
    const [tasaCambio, setTasaCambio] = useState(initialExchangeRate);
    const [loadingTasa, setLoadingTasa] = useState(parentLoading);

    // Estados para Conceptos Asignados (Extra)
    const [assignedConcepts, setAssignedConcepts] = useState(initialAssignedConcepts || []);
    const [loadingAssigned, setLoadingAssigned] = useState(parentLoading);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [availableConcepts, setAvailableConcepts] = useState([]);
    const [newConceptData, setNewConceptData] = useState({ concept: '', override_value: '' });

    // Constante fija para el Cestaticket (Valor de Ley)
    const MONTO_CESTATICKET_USD = 40.00;

    // Sync with props
    useEffect(() => {
        setAssignedConcepts(initialAssignedConcepts);
        setActiveContract(initialActiveContract);
        setTasaCambio(initialExchangeRate);
        setLoading(parentLoading);
        setLoadingAssigned(parentLoading);
        setLoadingTasa(parentLoading);
    }, [initialAssignedConcepts, initialActiveContract, initialExchangeRate, parentLoading]);

    const loadAvailableConcepts = async () => {
        try {
            const res = await axiosClient.get('/payroll-concepts/?active=true');
            setAvailableConcepts(res.data.results || res.data);
        } catch (error) {
            console.error("Error cargando catálogo:", error);
        }
    };

    const handleAddConcept = async (e) => {
        e.preventDefault();
        try {
            await axiosClient.post('/employee-concepts/', {
                employee: employeeId,
                concept: newConceptData.concept,
                override_value: newConceptData.override_value || null,
                active: true
            });
            setIsAddModalOpen(false);
            setNewConceptData({ concept: '', override_value: '' });
            onRefresh();
        } catch (error) {
            alert("Error asignando concepto. Verifique que no esté ya asignado.");
        }
    };

    const handleDeleteConcept = async (id) => {
        if (!window.confirm("¿Eliminar esta asignación?")) return;
        try {
            await axiosClient.delete(`/employee-concepts/${id}/`);
            onRefresh();
        } catch (error) {
            alert("Error eliminando concepto.");
        }
    };

    // Calcular conceptos desde el contrato (Fijos)
    const calculateContractConcepts = useCallback(() => {
        if (!activeContract) return [];

        const totalPackageUsd = parseFloat(activeContract.salary_amount) || 0;
        const baseBs = parseFloat(activeContract.base_salary_bs) || 0;
        const currentRate = tasaCambio || 1;

        const totalPackageBs = totalPackageUsd * currentRate;
        const cestaTicketBs = activeContract.includes_cestaticket ? (MONTO_CESTATICKET_USD * currentRate) : 0;

        let complementoBs = totalPackageBs - baseBs - cestaTicketBs;
        if (complementoBs < 0) complementoBs = 0;

        return [
            {
                code: 'SUELDO_BASE',
                name: 'Sueldo Base',
                type: 'EARNING',
                amountBs: baseBs,
                amountUsd: baseBs / currentRate,
                incideSalarial: true,
                description: 'Base imponible para prestaciones sociales, IVSS, FAOV'
            },
            {
                code: 'CESTATICKET',
                name: 'Cestaticket',
                type: 'EARNING',
                amountBs: cestaTicketBs,
                amountUsd: cestaTicketBs / currentRate,
                incideSalarial: false,
                description: 'Beneficio social de alimentación (Ley)'
            },
            {
                code: 'COMPLEMENTO',
                name: 'Complemento Salarial',
                type: 'EARNING',
                amountBs: complementoBs,
                amountUsd: complementoBs / currentRate,
                incideSalarial: false,
                description: 'Bono no salarial para completar paquete acordado'
            }
        ];
    }, [activeContract, tasaCambio]);

    const contractConcepts = calculateContractConcepts();
    const totalBs = contractConcepts.reduce((sum, c) => sum + c.amountBs, 0);
    const totalUsd = contractConcepts.reduce((sum, c) => sum + c.amountUsd, 0);

    // Helpers para mostrar conceptos asignados
    const getConceptDisplayValue = (assignment) => {
        // assignment.concept tiene los datos del catalogo
        // assignment.override_value es opcional
        const concept = assignment.concept;
        const val = assignment.override_value ? parseFloat(assignment.override_value) : parseFloat(concept.value);

        if (concept.computation_method === 'PERCENTAGE_OF_BASIC') return `${val}% Salario Base`;
        if (concept.computation_method === 'DYNAMIC_FORMULA') return `Fórmula Dinámica`;

        // Fixed Amount
        const bsVal = val * (concept.currency !== 'VES' ? tasaCambio : 1);
        return `Bs. ${bsVal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="text-xs font-black uppercase tracking-widest">Cargando información...</p>
            </div>
        );
    }

    if (!activeContract) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-amber-500" size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Sin contrato activo</h4>
                <p className="text-xs text-gray-500">Cree un contrato para gestionar la nómina.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Global */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Calculator size={20} className="text-nominix-electric" />
                        Estructura Salarial
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        Conceptos fijos y asignaciones especiales
                    </p>
                </div>
                {/* Tasa Badge */}
                <div className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black border border-blue-100 flex items-center gap-1.5">
                    {loadingTasa ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                    Tasa BCV: {loadingTasa ? '...' : `Bs. ${tasaCambio.toFixed(2)}`}
                </div>
            </div>

            {/* SECCIÓN 1: CONCEPTOS DE LEY (READ ONLY) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-gray-100"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Conceptos de Contrato (Automáticos)</span>
                    <div className="h-px flex-1 bg-gray-100"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {contractConcepts.map((concept, idx) => (
                        <ConceptCard key={concept.code} concept={concept} index={idx} />
                    ))}
                </div>

                {/* Resumen Total */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Paquete Mensual</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                <span className="text-sm font-bold text-slate-400">≈ ${totalUsd.toFixed(2)} USD</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl"><DollarSign size={24} className="text-nominix-electric" /></div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: CONCEPTOS ADICIONALES (EDITABLE) */}
            <div className="pt-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Asignaciones Adicionales</h4>
                            <p className="text-[10px] text-gray-400 font-bold">Conceptos extra fijos (Bonos, Préstamos, etc.)</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            loadAvailableConcepts();
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <PlusCircle size={14} /> Agregar Concepto
                    </button>
                </div>

                {loadingAssigned ? (
                    <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-gray-300" /></div>
                ) : assignedConcepts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-xs text-gray-400 font-medium">No hay conceptos adicionales asignados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assignedConcepts.map((assignment) => (
                            <div key={assignment.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex justify-between items-center group hover:shadow-lg transition-all">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${assignment.active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                            {assignment.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold">{assignment.concept.code}</span>
                                    </div>
                                    <h5 className="font-bold text-slate-800">{assignment.concept.name}</h5>
                                    <p className="text-xs text-nominix-electric font-bold mt-1">
                                        {getConceptDisplayValue(assignment)}
                                    </p>
                                    {assignment.override_value && (
                                        <p className="text-[9px] text-gray-400 mt-0.5 italic">
                                            (Valor personalizado: {assignment.override_value})
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteConcept(assignment.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL AGREGAR */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-slate-800">Asignar Concepto</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleAddConcept} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Concepto</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-100 text-sm font-bold text-slate-700"
                                    value={newConceptData.concept}
                                    onChange={e => setNewConceptData({ ...newConceptData, concept: e.target.value })}
                                >
                                    <option value="">Seleccione...</option>
                                    {availableConcepts.map(c => (
                                        <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Valor Personalizado (Opcional)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Dejar vacío para usar valor global"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-100 text-sm font-bold text-slate-700"
                                    value={newConceptData.override_value}
                                    onChange={e => setNewConceptData({ ...newConceptData, override_value: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 mt-2">
                                    Si el concepto es porcentaje, ingrese el %. Si es monto fijo, ingrese el monto.
                                </p>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-nominix-electric text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-nominix-dark transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> Guardar Asignación
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ... (ConceptCard keeps same) ...
const ConceptCard = ({ concept, index }) => {
    const colorStyles = [
        { bg: 'bg-green-50', border: 'border-green-100', accent: 'text-green-600', badge: 'bg-green-100 text-green-700' },
        { bg: 'bg-amber-50', border: 'border-amber-100', accent: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
        { bg: 'bg-nominix-electric/5', border: 'border-nominix-electric/20', accent: 'text-nominix-electric', badge: 'bg-nominix-electric/10 text-nominix-electric' },
    ];
    const style = colorStyles[index % colorStyles.length];

    return (
        <div className={`${style.bg} ${style.border} border rounded-2xl p-5 relative overflow-hidden transition-all hover:shadow-md`}>
            <div className={`absolute top-4 right-4 ${style.accent} opacity-20`}><DollarSign size={40} /></div>
            <div className="mb-4">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${style.badge}`}>
                    {concept.code}
                </span>
                <h4 className="text-sm font-bold text-slate-800 mt-2">{concept.name}</h4>
            </div>
            <div className="space-y-1">
                <p className={`text-xl font-black ${style.accent}`}>
                    Bs. {concept.amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] font-bold text-slate-400">≈ ${concept.amountUsd.toFixed(2)} USD</p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/5 flex items-center gap-2 flex-wrap">
                {concept.incideSalarial ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/80 rounded text-[8px] font-black text-green-700 uppercase">
                        <CheckCircle size={10} /> Incide Salarial
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/80 rounded text-[8px] font-black text-gray-500 uppercase">
                        No Salarial
                    </span>
                )}
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">{concept.description}</p>
        </div>
    );
};

export default EmployeeConcepts;
