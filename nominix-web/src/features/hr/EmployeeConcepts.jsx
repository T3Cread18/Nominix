import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
    Calculator, DollarSign, CheckCircle,
    Loader2, RefreshCw, FileText, PlusCircle, Trash2, Save, Info
} from 'lucide-react';
import { toast } from 'sonner';

// Hooks
import {
    useEmployeeConcepts,
    useAssignConcept,
    useDeleteAssignedConcept,
    useAvailableConcepts,
    useContracts,
    useExchangeRate
} from '../../hooks/useLabor';

// UI Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SelectField from '../../components/ui/SelectField';
import InputField from '../../components/ui/InputField';
import { SkeletonCard } from '../../components/ui/Skeleton';

const EmployeeConcepts = ({ employeeId }) => {
    // 1. Hooks de Datos
    const { data: contracts = [] } = useContracts(employeeId);
    const { data: assignedConcepts = [], isLoading: loadingAssigned } = useEmployeeConcepts(employeeId);
    const { data: availableConcepts = [] } = useAvailableConcepts(); // Catálogo
    const { data: exchangeRate = 60.00, isLoading: loadingRate } = useExchangeRate();

    // Mutations
    const assignMutation = useAssignConcept();
    const deleteMutation = useDeleteAssignedConcept();

    // Estado Local
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Formulario para agregar concepto
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

    // Derived State
    const activeContract = contracts.find(c => c.is_active);
    const tasaCambio = exchangeRate || 60.00;
    const MONTO_CESTATICKET_USD = 40.00;

    // --- CÁLCULOS (Simulación de Conceptos Fijos) ---
    const contractConcepts = useMemo(() => {
        if (!activeContract) return [];

        const totalPackageUsd = parseFloat(activeContract.salary_amount) || 0;
        const baseBs = parseFloat(activeContract.base_salary_bs) || 0;
        const currentRate = tasaCambio;

        const totalPackageBs = totalPackageUsd * currentRate;
        const cestaTicketBs = (MONTO_CESTATICKET_USD * currentRate); // Asumimos siempre aplica ley

        let complementoBs = totalPackageBs - baseBs - cestaTicketBs;
        if (complementoBs < 0) complementoBs = 0;

        return [
            {
                code: 'SUELDO_BASE',
                name: 'Sueldo Base',
                amountBs: baseBs,
                amountUsd: baseBs / currentRate,
                incideSalarial: true,
                description: 'Base imponible para prestaciones sociales, IVSS, FAOV',
                styleIndex: 0
            },
            {
                code: 'CESTATICKET',
                name: 'Cestaticket',
                amountBs: cestaTicketBs,
                amountUsd: cestaTicketBs / currentRate,
                incideSalarial: false,
                description: 'Beneficio social de alimentación (Ley)',
                styleIndex: 1
            },
            {
                code: 'COMPLEMENTO',
                name: 'Complemento Salarial',
                amountBs: complementoBs,
                amountUsd: complementoBs / currentRate,
                incideSalarial: false,
                description: 'Bono no salarial para completar paquete acordado',
                styleIndex: 2
            }
        ];
    }, [activeContract, tasaCambio]);

    const totalBs = contractConcepts.reduce((sum, c) => sum + c.amountBs, 0);
    const totalUsd = contractConcepts.reduce((sum, c) => sum + c.amountUsd, 0);


    // --- HANDLERS ---
    const onAddConcept = async (data) => {
        try {
            await assignMutation.mutateAsync({
                employee: employeeId,
                concept: data.concept,
                override_value: data.override_value || null,
                active: true
            });
            toast.success("Concepto asignado correctamente");
            setIsAddModalOpen(false);
            reset();
        } catch (error) {
            console.error(error);
            toast.error("Error asignando concepto. Verifique si ya existe.");
        }
    };

    const onDeleteConcept = async (id) => {
        if (!window.confirm("¿Eliminar esta asignación?")) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Asignación eliminada");
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    // Helper display value
    const getConceptDisplayValue = (assignment) => {
        const concept = assignment.concept;
        const val = assignment.override_value ? parseFloat(assignment.override_value) : parseFloat(concept.value);

        if (concept.computation_method === 'PERCENTAGE_OF_BASIC') return `${val}% Salario Base`;
        if (concept.computation_method === 'DYNAMIC_FORMULA') return `Fórmula Dinámica`;

        // Fixed Amount
        const bsVal = val * (concept.currency !== 'VES' ? tasaCambio : 1);
        return `Bs. ${bsVal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    };

    if (!activeContract && !loadingAssigned) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 bg-orange-50 text-orange-500 rounded-full">
                    <FileText size={32} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Sin Contrato Activo</h3>
                    <p className="text-sm text-gray-500">Debe registrar un contrato vigente para ver la estructura salarial.</p>
                </div>
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
                    {loadingRate ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                    Tasa BCV: {loadingRate ? '...' : `Bs. ${tasaCambio.toFixed(2)}`}
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
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
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
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        variant="secondary"
                        size="sm"
                        icon={PlusCircle}
                        className="text-[10px] uppercase tracking-widest"
                    >
                        Agregar Concepto
                    </Button>
                </div>

                {loadingAssigned ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                ) : assignedConcepts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-xs text-gray-400 font-medium">No hay conceptos adicionales asignados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assignedConcepts.map((assignment) => (
                            <Card key={assignment.id} className="flex justify-between items-center group hover:border-purple-200 transition-all">
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
                                        <p className="text-[9px] text-gray-400 mt-0.5 italic flex items-center gap-1">
                                            <Info size={10} /> Valor personalizado: {assignment.override_value}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    onClick={() => onDeleteConcept(assignment.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL AGREGAR */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Asignar Concepto"
                size="md"
            >
                <form onSubmit={handleSubmit(onAddConcept)} className="p-1 space-y-4">
                    <SelectField
                        label="Concepto"
                        {...register('concept', { required: 'Requerido' })}
                        options={[
                            { value: '', label: 'Seleccionar...' },
                            ...availableConcepts.map(c => ({ value: c.id, label: `[${c.code}] ${c.name}` }))
                        ]}
                        error={errors.concept?.message}
                    />

                    <div>
                        <InputField
                            label="Valor Personalizado (Opcional)"
                            type="number"
                            step="0.01"
                            placeholder="Dejar vacío para usar valor global"
                            {...register('override_value')}
                        />
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">
                            Si el concepto es porcentaje, ingrese el %. Si es monto fijo, ingrese el monto.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            variant="electric"
                            className="w-full justify-center"
                            icon={Save}
                            isLoading={assignMutation.isPending}
                        >
                            Guardar Asignación
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

// Subcomponente Visual (lo mantengo simple inline, usando div styled para no complicar Card)
const ConceptCard = ({ concept, index }) => {
    const colorStyles = [
        { bg: 'bg-green-50', border: 'border-green-100', accent: 'text-green-600', badge: 'bg-green-100 text-green-700' },
        { bg: 'bg-amber-50', border: 'border-amber-100', accent: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
        { bg: 'bg-blue-50', border: 'border-blue-100', accent: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
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
                <p className="text-[10px] font-bold text-slate-400">≈ ${concept.amountUsd?.toFixed(2)} USD</p>
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
            <p className="text-[9px] text-slate-500 mt-2 leading-relaxed opacity-80">{concept.description}</p>
        </div>
    );
};

export default EmployeeConcepts;
