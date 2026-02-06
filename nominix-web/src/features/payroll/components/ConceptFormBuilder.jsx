
import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../../api/axiosClient';
import { toast } from 'sonner';
import {
    Settings2,
    Calculator,
    Layers,
    Save,
    X,
    Hash,
    FileText,
    CheckCircle2,
    AlertCircle,
    Coins,
    ChevronRight,
    Code2,
    Eye,
    EyeOff,
    Info,
    ArrowUpDown,
    Percent,
    DollarSign,
    Database,
    Tag,
    Calendar,
    ShieldCheck,
    Loader2
} from 'lucide-react';

// ============================================================================
// COMPONENTES DE UI REUTILIZABLES (ESTILO PREMIUM)
// ============================================================================

const FormSection = ({ title, icon: Icon, children, description }) => (
    <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-xl bg-nominix-electric/10 flex items-center justify-center border border-nominix-electric/20">
                <Icon className="text-nominix-electric" size={20} />
            </div>
            <div>
                <h3 className="text-white font-bold tracking-tight">{title}</h3>
                {description && <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-tight">{description}</p>}
            </div>
        </div>
        <div className="pt-2">
            {children}
        </div>
    </div>
);

const CustomInput = React.forwardRef(({ label, icon: Icon, error, ...props }, ref) => (
    <div className="space-y-1.5 w-full">
        {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>}
        <div className="relative group">
            {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${props.disabled ? 'text-gray-600' : 'text-gray-400 group-focus-within:text-nominix-electric'}`} size={16} />}
            <input
                {...props}
                ref={ref}
                className={`w-full bg-black/40 border ${error ? 'border-red-500/50' : 'border-white/5'} rounded-2xl py-3 ${Icon ? 'pl-11' : 'px-4'} pr-4 text-white text-sm outline-none focus:border-nominix-electric/50 focus:ring-4 focus:ring-nominix-electric/5 transition-all placeholder:text-gray-700 disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-white/5`}
            />
        </div>
        {error && <span className="text-red-500 text-[10px] font-bold ml-1">{error}</span>}
    </div>
));
CustomInput.displayName = 'CustomInput';

const CustomSelect = React.forwardRef(({ label, icon: Icon, options = [], ...props }, ref) => (
    <div className="space-y-1.5 w-full">
        {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>}
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-nominix-electric transition-colors pointer-events-none" size={16} />}
            <select
                {...props}
                ref={ref}
                className={`w-full bg-black/40 border border-white/5 rounded-2xl py-3 ${Icon ? 'pl-11' : 'px-4'} pr-10 text-white text-sm outline-none focus:border-nominix-electric/50 focus:ring-4 focus:ring-nominix-electric/5 transition-all appearance-none cursor-pointer`}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#1A1A1E] text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 rotate-90 pointer-events-none" size={16} />
        </div>
    </div>
));
CustomSelect.displayName = 'CustomSelect';

const Toggle = ({ label, checked, onChange, id }) => (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group" onClick={() => onChange(!checked)}>
        <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${checked ? 'bg-nominix-electric shadow-[0_0_10px_rgba(0,82,255,0.3)]' : 'bg-gray-800'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${checked ? 'left-5' : 'left-1 shadow-md'}`}></div>
        </div>
        <label htmlFor={id} className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors cursor-pointer select-none">
            {label}
        </label>
    </div>
);

// ============================================================================
// CONFIGURACIÓN DE UI PARA CADA BEHAVIOR
// ============================================================================
const BEHAVIOR_CONFIG = {
    'LAW_DEDUCTION': {
        title: "Deducción de Ley",
        icon: ShieldCheck,
        description: "Regulaciones de seguridad social (IVSS, FAOV, RPE)",
        fields: [
            { name: 'rate', label: 'Tasa (0.00 - 1.00)', type: 'number', step: '0.0001', required: true, help: "Ej: 0.04 para 4%", icon: Percent },
            {
                name: 'base_source', label: 'Fuente de Base', type: 'select', required: true, icon: Database,
                options: [
                    { value: 'ACCUMULATOR', label: 'Acumulador (Suma de Incidencias)' },
                    { value: 'TOTAL_EARNINGS', label: 'Total Asignaciones' },
                    { value: 'BASIC_SALARY', label: 'Sueldo Base Mensual' }
                ]
            },
            {
                name: 'base_label', label: 'Etiqueta Acumulador', type: 'text', icon: Tag,
                required: true,
                help: "Tag interno (ej: FAOV_BASE)",
                showIf: (params) => params.base_source === 'ACCUMULATOR'
            },
            { name: 'cap_multiplier', label: 'Tope (S.M.)', type: 'number', step: '1', help: "Multiplicador salario mínimo", icon: ArrowUpDown },
            { name: 'multiplier_var', label: 'Var. Semanal', type: 'text', help: "Ej: 'LUNES'", icon: Calendar }
        ]
    },
    'DYNAMIC': {
        title: "Fórmula de Sistema",
        icon: Code2,
        description: "Ejecución de lógica avanzada personalizada",
        customRender: true
    }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ConceptFormBuilder({ initialData, onSave, onCancel }) {
    const queryClient = useQueryClient();
    const isEditing = !!initialData;

    // 1. Fetch Metadata
    const { data: configMetadata, isLoading: loadingMeta } = useQuery({
        queryKey: ['conceptConfigMetadata'],
        queryFn: async () => {
            const res = await axios.get('/concepts/config-metadata/');
            return res.data;
        }
    });

    const { data: currencies } = useQuery({
        queryKey: ['currencies'],
        queryFn: async () => {
            const res = await axios.get('/currencies/');
            return res.data;
        }
    });

    const { data: allConcepts } = useQuery({
        queryKey: ['payrollConcepts'],
        queryFn: async () => {
            const res = await axios.get('/payroll-concepts/');
            return res.data?.results || res.data || [];
        }
    });

    // 2. Form Setup
    const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            code: initialData?.code || '',
            name: initialData?.name || '',
            kind: initialData?.kind || 'EARNING',
            behavior: initialData?.behavior || 'DYNAMIC',
            currency: initialData?.currency || 'VES',
            computation_method: initialData?.computation_method || 'FIXED_AMOUNT',
            is_salary_incidence: initialData?.is_salary_incidence ?? true,
            value: initialData?.value || 0,
            incidences: initialData?.incidences || [],
            system_params: initialData?.system_params || {},
            formula: initialData?.formula || '',
            active: initialData?.active ?? true,
            appears_on_receipt: initialData?.appears_on_receipt ?? true,
            show_even_if_zero: initialData?.show_even_if_zero ?? false,
            calculation_base: initialData?.calculation_base || 'TOTAL',
            receipt_order: initialData?.receipt_order || 0,
            deducts_from_base_salary: initialData?.deducts_from_base_salary ?? false,
            adds_to_complement: initialData?.adds_to_complement ?? false
        }
    });

    const selectedBehavior = watch('behavior');
    const selectedMethod = watch('computation_method');
    const currentParams = watch('system_params');
    const selectedKind = watch('kind');

    // Sincronización automática de Behavior -> Method
    useEffect(() => {
        if (selectedBehavior === 'DYNAMIC') {
            setValue('computation_method', 'DYNAMIC_FORMULA');
        } else if (selectedBehavior === 'FIXED') {
            setValue('computation_method', 'FIXED_AMOUNT');
        } else if (selectedBehavior === 'LAW_DEDUCTION') {
            setValue('computation_method', 'PERCENTAGE_OF_BASIC');
        }
        // NOTE: For 'LOAN', we do NOT force a method, allowing DYNAMIC_FORMULA or FIXED_AMOUNT
    }, [selectedBehavior, setValue]);

    // 3. Mutation
    const validationMutation = useMutation({
        mutationFn: async (formula) => {
            const res = await axios.post('/payroll/validate-formula/', { formula });
            return res.data;
        }
    });

    const mutation = useMutation({
        mutationFn: (data) => {
            if (isEditing) {
                return axios.put(`/payroll-concepts/${initialData.id}/`, data);
            }
            return axios.post('/payroll-concepts/', data);
        },
        onSuccess: () => {
            toast.success(isEditing ? 'Configuración actualizada' : 'Concepto creado exitosamente');
            queryClient.invalidateQueries(['payroll-concepts']);
            onSave && onSave();
        },
        onError: (err) => {
            console.error("FULL MUTATION ERROR:", err);
            console.error("RESPONSE DATA:", err.response?.data);
            const errorDetails = err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message;
            toast.error('Error: ' + errorDetails);
        }
    });

    const onSubmit = async (formData) => {
        const payload = { ...formData };

        if (payload.computation_method === 'DYNAMIC_FORMULA') {
            const validationNotice = toast.loading('Validando integridad de fórmula...');
            try {
                const check = await validationMutation.mutateAsync(payload.formula);
                if (!check.success) {
                    toast.error(`Error en fórmula: ${check.error}`, { id: validationNotice });
                    return;
                }
                toast.success('Fórmula validada correctamente', { id: validationNotice });
            } catch (err) {
                toast.error('Falla técnica en validación', { id: validationNotice });
                return;
            }
        }

        // --- MANEJO ESPECIFICO PARA LAW_DEDUCTION ---
        if (payload.behavior === 'LAW_DEDUCTION') {
            // Asegurar que system_params tenga lo necesario
            payload.system_params = {
                ...payload.system_params,
                rate: payload.value, // La tasa viene del campo visual 'value'
                base_source: payload.system_params?.base_source || 'BASIC_SALARY' // Default seguro
            };
        }

        // --- LIMPIEZA DE INCIDENCIAS ---
        // Las deducciones no deberían llevar incidencias (acumuladores de base) usualmente, 
        // y el UI las oculta, así que limpiamos para evitar que se envíe basura oculta.
        if (payload.kind === 'DEDUCTION') {
            payload.incidences = [];
        }

        // --- LIMPIEZA GENERAL ---
        // Solo limpiamos la fórmula si el método NO permite fórmula.
        // DYNAMIC_FORMULA requiere fórmula. FIXED_AMOUNT acepta fórmula de ajuste.
        if (payload.computation_method !== 'DYNAMIC_FORMULA' && payload.computation_method !== 'FIXED_AMOUNT') {
            payload.formula = '';
        }

        console.log("Submitting Payload FINAL:", JSON.stringify(payload, null, 2));
        mutation.mutate(payload);
    };

    if (loadingMeta) return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="animate-spin text-nominix-electric" size={40} />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Cargando Motor de Conceptos...</p>
        </div>
    );

    return (
        <div className="bg-[#0f1115] rounded-[32px] p-6 md:p-10 border border-white/10 shadow-3xl overflow-hidden relative min-h-[600px]">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-nominix-electric/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 space-y-8 w-full mx-auto">

                {/* CABECERA DINÁMICA */}
                <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-4">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-nominix-electric/20 to-nominix-electric/5 border border-nominix-electric/20 rounded-2xl flex items-center justify-center shadow-2xl">
                            <Settings2 className="text-nominix-electric" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                                {isEditing ? 'Configurar' : 'Nuevo'} <span className="text-nominix-electric not-italic">Concepto</span>
                            </h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-1">Lógica Salarial & Parametrización</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all hover:rotate-90 active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">

                    {/* COLUMNA PRINCIPAL (IZQUIERDA) */}
                    <div className="xl:col-span-8 space-y-8">
                        <FormSection title="Identificación" icon={FileText} description="Atributos básicos del sistema">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <CustomInput
                                    label="Código Único"
                                    icon={Hash}
                                    {...register('code', { required: 'Requerido' })}
                                    disabled={isEditing}
                                    placeholder="EJ: SUELDO_BASE"
                                    error={errors.code?.message}
                                />
                                <CustomInput
                                    label="Nombre Descriptivo"
                                    icon={FileText}
                                    {...register('name', { required: 'Requerido' })}
                                    placeholder="Ej: Bonificación Especial"
                                    error={errors.name?.message}
                                />
                                <CustomSelect
                                    label="Tipo de Concepto"
                                    icon={Layers}
                                    {...register('kind')}
                                    options={configMetadata?.kinds?.map(k => ({ value: k.value, label: k.label }))}
                                />
                                <CustomSelect
                                    label="Comportamiento (Handler)"
                                    icon={Settings2}
                                    {...register('behavior')}
                                    options={configMetadata?.behaviors?.map(b => ({ value: b.value, label: b.label }))}
                                />
                                <CustomSelect
                                    label="Método de Cálculo"
                                    icon={Calculator}
                                    {...register('computation_method')}
                                    options={configMetadata?.computation_methods?.map(m => ({ value: m.value, label: m.label }))}
                                />
                            </div>
                        </FormSection>

                        <FormSection title="Lógica de Cálculo" icon={Calculator} description="Reglas y parámetros matemáticos">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <CustomSelect
                                    label="Base de Cálculo"
                                    icon={ArrowUpDown}
                                    {...register('calculation_base')}
                                    options={configMetadata?.calculation_base_options || [
                                        { value: 'TOTAL', label: 'Salario Total' },
                                        { value: 'BASE', label: 'Sueldo Base' }
                                    ]}
                                />
                                <CustomSelect
                                    label="Moneda de Referencia"
                                    icon={Coins}
                                    {...register('currency')}
                                    options={(Array.isArray(currencies) ? currencies : (currencies?.results || [])).map(c => ({
                                        value: c.code,
                                        label: `${c.name} (${c.code})`
                                    }))}
                                />
                            </div>

                            {/* CONFIGURACIÓN ESPECÍFICA: LAW_DEDUCTION */}
                            {selectedBehavior === 'LAW_DEDUCTION' && (
                                <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 mb-4 text-blue-400">
                                        <ShieldCheck size={16} />
                                        <h4 className="text-xs font-bold uppercase tracking-widest">Parámetros de Deducción Legal</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <CustomSelect
                                            label="Fuente de Base Imponible"
                                            icon={Database}
                                            {...register('system_params.base_source', { required: 'Requerido para deducciones de ley' })}
                                            options={[
                                                { value: 'BASIC_SALARY', label: 'Sueldo Base Mensual' },
                                                { value: 'TOTAL_EARNINGS', label: 'Total Asignaciones (Salario Normal)' },
                                                { value: 'ACCUMULATOR', label: 'Acumulador Específico' }
                                            ]}
                                        />
                                        {currentParams?.base_source === 'ACCUMULATOR' && (
                                            <CustomInput
                                                label="Etiqueta Acumulador (Tag)"
                                                icon={Tag}
                                                placeholder="Ej: FAOV_BASE"
                                                {...register('system_params.base_label', { required: 'Si elige acumulador, debe especificar fl etiqueta' })}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedMethod !== 'DYNAMIC_FORMULA' && (
                                <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                                    <CustomInput
                                        label={selectedMethod === 'PERCENTAGE_OF_BASIC' ? "Tasa / Porcentaje (Ej: 0.15 para 15%)" : "Monto Fijo"}
                                        icon={selectedMethod === 'PERCENTAGE_OF_BASIC' ? Percent : DollarSign}
                                        type="number"
                                        step="0.0001"
                                        {...register('value', { required: 'Requerido' })}
                                        error={errors.value?.message}
                                    />
                                </div>
                            )}

                            {/* NUEVO: Fórmula de Ajuste para FIXED_AMOUNT */}
                            {selectedMethod === 'FIXED_AMOUNT' && (
                                <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Code2 size={14} className="text-amber-400" />
                                            <label className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest">
                                                Fórmula de Ajuste (Opcional)
                                            </label>
                                        </div>
                                        <div className="px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-[9px] font-bold text-amber-500 flex items-center gap-1.5 uppercase">
                                            <Info size={10} /> Se suma al monto fijo
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const formula = watch('formula');
                                                if (!formula) return toast.info('Escriba una fórmula primero');
                                                const res = await validationMutation.mutateAsync(formula);
                                                if (res.success) {
                                                    toast.success(`Ajuste validado: ${res.result}`);
                                                } else {
                                                    toast.error(`Error: ${res.error}`);
                                                }
                                            }}
                                            disabled={validationMutation.isLoading}
                                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/20 text-[9px] font-bold uppercase transition-all flex items-center gap-2"
                                        >
                                            {validationMutation.isLoading ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
                                            Probar
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <textarea
                                            {...register('formula')}
                                            rows={3}
                                            className="w-full font-mono text-sm p-4 bg-[#0d0d0f] border border-amber-500/10 rounded-2xl text-amber-400 outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                            placeholder="Ej: PRIMA_ASISTENCIA - DESCUENTO_TARDANZA"
                                        />
                                    </div>
                                    <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10 space-y-2">
                                        <p className="text-[9px] font-black text-amber-400/60 uppercase tracking-widest flex items-center gap-2">
                                            <Info size={10} /> Variables de Ajuste
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {['VALOR_BASE', 'CANTIDAD', 'MONTO_CALCULADO'].map(v => (
                                                <span
                                                    key={v}
                                                    onClick={() => {
                                                        const current = watch('formula') || '';
                                                        setValue('formula', current + (current ? ' + ' : '') + v);
                                                    }}
                                                    className="px-2 py-1 bg-black/40 text-[10px] text-amber-400 rounded-md border border-amber-500/20 font-mono hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                                                >
                                                    {v}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-gray-500 mt-2 leading-tight">
                                            También puedes usar cualquier concepto calculado previamente (según <code className="text-amber-400">receipt_order</code>)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedMethod === 'DYNAMIC_FORMULA' ? (
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fórmula Python (simple_eval)</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const formula = watch('formula');
                                                    if (!formula) return toast.info('Escriba una fórmula primero');
                                                    const res = await validationMutation.mutateAsync(formula);
                                                    if (res.success) {
                                                        toast.success(`Validación exitosa: Result=${res.result}`);
                                                    } else {
                                                        toast.error(`Error: ${res.error}`);
                                                    }
                                                }}
                                                disabled={validationMutation.isLoading}
                                                className="px-3 py-1.5 bg-nominix-electric/10 hover:bg-nominix-electric/20 text-nominix-electric rounded-lg border border-nominix-electric/20 text-[9px] font-bold uppercase transition-all flex items-center gap-2"
                                            >
                                                {validationMutation.isLoading ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
                                                Probar Fórmula
                                            </button>
                                            <div className="px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20 text-[9px] font-bold text-green-500 flex items-center gap-1.5 uppercase">
                                                <Code2 size={12} /> Sandbox Activo
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <textarea
                                            {...register('formula')}
                                            rows={8}
                                            className="w-full font-mono text-sm p-5 bg-[#0d0d0f] border border-white/5 rounded-3xl text-green-400 outline-none focus:border-nominix-electric/50 transition-all shadow-inner"
                                            placeholder="Ej: (SALARIO_DIARIO * 1.5) * HED"
                                        />
                                        {validationMutation.data && (
                                            <div className={`absolute bottom-4 right-4 p-3 rounded-xl border backdrop-blur-md animate-in fade-in slide-in-from-right-2 ${validationMutation.data.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                <p className="text-[10px] font-bold uppercase mb-1">{validationMutation.data.success ? '✓ Éxito' : '✕ Error'}</p>
                                                <p className="text-[11px] font-mono leading-tight whitespace-pre-wrap max-w-[250px]">
                                                    {validationMutation.data.success ? `Resultado: ${validationMutation.data.result}\nTraza: ${validationMutation.data.trace}` : validationMutation.data.error}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Info size={12} /> Variables Sistema
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {['SALARIO_MENSUAL', 'SALARIO_DIARIO', 'DIAS', 'ANTIGUEDAD', 'LUNES', 'HED', 'HEN', 'BN'].map(v => (
                                                    <span key={v} className="px-2 py-1 bg-black/40 text-[10px] text-gray-400 rounded-md border border-white/5 font-mono group hover:border-nominix-electric/30 hover:text-white transition-all cursor-default">{v}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {allConcepts?.length > 0 && (
                                            <div>
                                                <p className="text-[9px] font-black text-nominix-electric opacity-70 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Calculator size={12} /> Conceptos Existentes
                                                </p>
                                                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {allConcepts.filter(c => c.id !== initialData?.id).map(c => (
                                                        <React.Fragment key={c.code}>
                                                            <span
                                                                onClick={() => {
                                                                    const current = watch('formula') || '';
                                                                    setValue('formula', current + (current ? ' + ' : '') + c.code);
                                                                }}
                                                                title={`${c.name} (Base: ${c.value})`}
                                                                className="px-2 py-1 bg-nominix-electric/5 text-[10px] text-nominix-electric/70 rounded-md border border-nominix-electric/10 font-mono hover:bg-nominix-electric hover:text-white transition-all cursor-pointer"
                                                            >
                                                                {c.code}
                                                            </span>
                                                            <span
                                                                onClick={() => {
                                                                    const current = watch('formula') || '';
                                                                    setValue('formula', current + (current ? ' + ' : '') + `${c.code}_CANT`);
                                                                }}
                                                                title={`${c.name} (Cant. ej: 1.0)`}
                                                                className="px-2 py-1 bg-amber-500/5 text-[10px] text-amber-500/70 rounded-md border border-amber-500/10 font-mono hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                                                            >
                                                                {c.code}_CANT
                                                            </span>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {configMetadata?.accumulators?.length > 0 && (
                                            <div>
                                                <p className="text-[9px] font-black text-purple-400 opacity-70 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Layers size={12} /> Acumuladores (TOTAL)
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {configMetadata.accumulators.map(acc => (
                                                        <span
                                                            key={acc.code}
                                                            onClick={() => {
                                                                const current = watch('formula') || '';
                                                                setValue('formula', current + (current ? ' + ' : '') + `TOTAL_${acc.code}`);
                                                            }}
                                                            title={acc.label}
                                                            className="px-2 py-1 bg-purple-500/5 text-[10px] text-purple-400/70 rounded-md border border-purple-500/10 font-mono hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                                                        >
                                                            TOTAL_{acc.code}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-10 border-2 border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center space-y-3">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                                        <Settings2 className="text-gray-600" size={20} />
                                    </div>
                                    <p className="text-gray-500 text-xs font-medium">Este comportamiento utiliza parámetros fijos de sistema.</p>
                                </div>
                            )}
                        </FormSection>
                    </div>

                    {/* COLUMNA DERECHA: CONFIGURACIÓN ADICIONAL */}
                    <div className="xl:col-span-4 space-y-8">
                        <FormSection title="Visualización" icon={Eye} description="Presencia en el sistema">
                            <div className="space-y-3">
                                <Toggle label="Concepto Activo" checked={watch('active')} onChange={v => setValue('active', v)} id="t-active" />
                                <Toggle label="Incidencia Salarial / Integración" checked={watch('is_salary_incidence')} onChange={v => setValue('is_salary_incidence', v)} id="t-incidence" />
                                <Toggle label="Mostrar en Recibo" checked={watch('appears_on_receipt')} onChange={v => setValue('appears_on_receipt', v)} id="t-receipt" />
                                <Toggle label="Mostrar aunque sea Cero" checked={watch('show_even_if_zero')} onChange={v => setValue('show_even_if_zero', v)} id="t-zero" />
                                {(selectedBehavior === 'DYNAMIC' || selectedBehavior === 'FIXED') && (
                                    <Toggle
                                        label="Resta Días del Sueldo Base"
                                        checked={watch('deducts_from_base_salary')}
                                        onChange={v => setValue('deducts_from_base_salary', v)}
                                        id="t-deducts"
                                    />
                                )}
                                {(selectedBehavior === 'DYNAMIC' || selectedBehavior === 'FIXED') && (
                                    <Toggle
                                        label="Suma al Complemento/Bono"
                                        checked={watch('adds_to_complement')}
                                        onChange={v => setValue('adds_to_complement', v)}
                                        id="t-adds-complement"
                                    />
                                )}
                                <div className="pt-2">
                                    <CustomInput label="Orden en Recibo" type="number" icon={ArrowUpDown} {...register('receipt_order')} />
                                </div>
                            </div>
                        </FormSection>

                        {selectedKind === 'EARNING' && (
                            <FormSection title="Incidencias" icon={Layers} description="Abono a acumuladores">
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar focus:outline-none">
                                    {configMetadata?.accumulators?.map(acc => {
                                        const isSelected = watch('incidences')?.includes(acc.code);
                                        return (
                                            <div
                                                key={acc.code}
                                                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer group select-none ${isSelected ? 'bg-nominix-electric/5 border-nominix-electric/30 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                                onClick={() => {
                                                    const current = watch('incidences') || [];
                                                    if (current.includes(acc.code)) {
                                                        setValue('incidences', current.filter(c => c !== acc.code));
                                                    } else {
                                                        setValue('incidences', [...current, acc.code]);
                                                    }
                                                }}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-nominix-electric border-nominix-electric' : 'bg-black/30 border-white/10 group-hover:border-white/20'}`}>
                                                    {isSelected && <CheckCircle2 className="text-white" size={12} />}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>{acc.label}</p>
                                                    <p className="text-[9px] text-gray-500 uppercase mt-0.5 font-bold">{acc.code}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </FormSection>
                        )}
                    </div>
                </div>

                {/* BARRA DE ACCIONES FLOTANTE O FIJA */}
                <div className="sticky bottom-4 bg-[#121214]/80 backdrop-blur-3xl border border-white/10 p-4 rounded-[32px] flex items-center justify-between shadow-3xl z-50">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-8 py-4 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-all"
                    >
                        Descartar
                    </button>
                    <button
                        type="submit"
                        disabled={mutation.isLoading}
                        className="flex items-center gap-3 px-10 py-4 bg-nominix-electric hover:bg-nominix-electric/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-nominix-electric/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {mutation.isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Procesando</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Guardar Configuración</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
