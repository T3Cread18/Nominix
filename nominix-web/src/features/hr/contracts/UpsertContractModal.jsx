import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Briefcase, Calendar, DollarSign, Building2, Calculator, Save, Info, Loader2, Percent } from 'lucide-react';
import { toast } from 'sonner';

// Hooks
import { useCompanyConfig, useBranches, useJobPositions } from '../../../hooks/useOrganization';
import { useCreateContract, useUpdateContract, useExchangeRate } from '../../../hooks/useLabor';

// UI Components
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';
import DepartmentSelector from '../../../components/DepartmentSelector';
import { cn } from '../../../utils/cn';

// --- CUSTOM HOOKS ---

/**
 * Hook to handle real-time salary simulation logic.
 * Encapsulates all currency conversion, bonus calculations, and Salary Split Strategy.
 */
const useSalarySimulation = (control, bcvRate, companyConfig, setValue) => {
    const salaryAmount = useWatch({ control, name: 'salary_amount' });
    const baseSalaryBs = useWatch({ control, name: 'base_salary_bs' });

    // Explicit helper to calculate Base Salary based on Strategy
    // usage: call this when salary_amount input changes
    const calculateBaseFromTotal = (totalValue) => {
        if (companyConfig && totalValue && !isNaN(parseFloat(totalValue))) {
            const totalSalary = parseFloat(totalValue);
            const currentRate = bcvRate || 1;
            const splitMode = companyConfig.salary_split_mode || 'PERCENTAGE';
            let calculatedBaseBs = 130;

            if (totalSalary > 0) {
                if (splitMode === 'PERCENTAGE') {
                    const pct = parseFloat(companyConfig.split_percentage_base) || 30;
                    calculatedBaseBs = (totalSalary * currentRate * (pct / 100));
                } else if (splitMode === 'FIXED_BASE') {
                    const fixedBaseUsd = parseFloat(companyConfig.split_fixed_amount) || 0;
                    calculatedBaseBs = fixedBaseUsd * currentRate;
                } else if (splitMode === 'FIXED_BONUS') {
                    const fixedBonusUsd = parseFloat(companyConfig.split_fixed_amount) || 0;
                    const baseUsd = totalSalary - fixedBonusUsd;
                    calculatedBaseBs = baseUsd > 0 ? (baseUsd * currentRate) : 130;
                }

                setValue('base_salary_bs', calculatedBaseBs.toFixed(2), { shouldDirty: true });
            }
        }
    };

    return {
        ...useMemo(() => {
            const totalPackageUsd = parseFloat(salaryAmount) || 0;
            const baseBs = parseFloat(baseSalaryBs) || 0;
            const currentRate = bcvRate || 1;
            const MONTO_CESTATICKET_USD = 40.00;

            const totalPackageBs = totalPackageUsd * currentRate;
            const cestaTicketBs = MONTO_CESTATICKET_USD * currentRate;

            let complementoBs = totalPackageBs - baseBs - cestaTicketBs;
            if (complementoBs < 0) complementoBs = 0;

            return {
                totalPackageBs,
                cestaTicketBs,
                complementoBs,
                baseBs,
                isValid: totalPackageUsd > 0
            };
        }, [salaryAmount, baseSalaryBs, bcvRate]), calculateBaseFromTotal
    };
};




// --- SUB-COMPONENTS ---

const SalarySimulator = ({ simulation, bcvRate, isLoadingRate, isSubmitting }) => {
    return (
        <div className="w-full md:w-[320px] bg-slate-50/80 backdrop-blur-sm p-6 rounded-[2rem] border border-gray-100/50 flex flex-col h-full sticky top-0 shadow-sm">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                <Calculator size={14} className="text-nominix-electric" />
                Simulación en Tiempo Real
            </h4>

            {isLoadingRate ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[200px]">
                    <Loader2 className="animate-spin text-nominix-electric" size={32} />
                    <p className="text-[10px] mt-4 font-bold uppercase tracking-widest">Sincronizando BCV...</p>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <SummaryCard
                        label="Sueldo Base"
                        amount={simulation.baseBs}
                        note="Incide en Prestaciones / Utilidades"
                        noteColor="text-green-600"
                        icon={<Building2 size={12} className="text-green-600" />}
                    />
                    <SummaryCard
                        label="Cestaticket (Ley)"
                        amount={simulation.cestaTicketBs}
                        note="Beneficio de Alimentación ($40 Ref)"
                        icon={<Info size={12} className="text-gray-400" />}
                    />
                    <SummaryCard
                        label="Complemento (Bono)"
                        amount={simulation.complementoBs}
                        note="No Salarial / Sin Incidencia"
                        highlight
                        icon={<DollarSign size={12} className="text-nominix-electric" />}
                    />

                    <div className="border-t border-gray-200/50 my-4"></div>

                    {/* Footer Info */}
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex gap-3 items-center group hover:border-nominix-electric/20 transition-colors">
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-500 group-hover:bg-nominix-electric group-hover:text-white transition-colors">
                            <Info size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tasa de Cambio</p>
                            <p className="text-xs font-bold text-slate-700">BCV: <span className="font-mono">Bs. {bcvRate.toFixed(2)}</span></p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-auto pt-8 flex flex-col gap-3">
                <Button
                    type="submit"
                    form="contract-form"
                    variant="electric"
                    className="w-full justify-center py-4 text-xs font-black tracking-widest uppercase rounded-2xl shadow-lg shadow-nominix-electric/20 text-white"
                    isLoading={isSubmitting}
                    icon={Save}
                >
                    Guardar Contrato
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => document.getElementById('close-modal-btn')?.click()}
                    className="w-full justify-center py-4 text-xs font-bold text-gray-400 hover:text-slate-700"
                >
                    Cancelar Operación
                </Button>
            </div>
        </div>
    );
};

const SummaryCard = ({ label, amount, note, noteColor = "text-gray-400", highlight = false, icon }) => (
    <div className={cn(
        "p-4 rounded-2xl border transition-all duration-300",
        highlight
            ? 'bg-gradient-to-br from-nominix-electric/5 to-transparent border-nominix-electric/20 shadow-lg shadow-nominix-electric/5'
            : 'bg-white border-gray-100 hover:border-gray-200'
    )}>
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                {icon && <div className={cn("p-1 rounded-lg", highlight ? "bg-white/50" : "bg-gray-50")}>{icon}</div>}
                <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    highlight ? 'text-nominix-electric' : 'text-slate-500'
                )}>{label}</span>
            </div>
            <span className={cn(
                "text-sm font-black font-mono tracking-tight",
                highlight ? 'text-nominix-electric' : 'text-slate-800'
            )}>Bs. {amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
        </div>
        <p className={cn("text-[9px] font-medium pl-1", noteColor)}>{note}</p>
    </div>
);

const ContractForm = ({ register, control, errors, watchedValues, jobPositions, branches, employeeData, handleJobPositionChange, formState, calculateBaseFromTotal }) => {
    const isJobSelected = !!watchedValues.job_position;

    return (
        <form id="contract-form" className="flex-1 space-y-8 pr-2">

            {/* 1. INFORMACIÓN GENERAL */}
            <section>
                <SectionHeader icon={Calendar} title="Vigencia y Tipo" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <SelectField
                        label="Tipo de Contrato"
                        {...register('contract_type')}
                        options={[
                            { value: 'INDEFINITE', label: 'Tiempo Indeterminado' },
                            { value: 'FIXED_TERM', label: 'Tiempo Determinado' },
                            { value: 'PROJECT', label: 'Por Obra Determinada' }
                        ]}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            label="Fecha Inicio"
                            type="date"
                            {...register('start_date', { required: 'Requerido' })}
                            error={errors.start_date?.message}
                        />
                        {watchedValues.contract_type !== 'INDEFINITE' && (
                            <div className="animate-in fade-in zoom-in-95">
                                <InputField
                                    label="Fecha Fin"
                                    type="date"
                                    {...register('end_date')}
                                    className="bg-blue-50/30 border-blue-100"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. ESQUEMA SALARIAL */}
            <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-nominix-electric/5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700"></div>

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <SectionHeader icon={DollarSign} title="Compensación" className="mb-0" />
                    {isJobSelected && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-nominix-electric bg-nominix-electric/10 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Briefcase size={10} /> Definido por Cargo
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                    <InputField
                        label="Total Paquete Mensual"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        icon={DollarSign}
                        {...register('salary_amount', {
                            required: 'Requerido',
                            onChange: (e) => !isJobSelected && calculateBaseFromTotal(e.target.value)
                        })}
                        error={errors.salary_amount?.message}
                        className={cn("text-lg font-black text-nominix-dark", isJobSelected && "bg-gray-50 text-gray-400 cursor-not-allowed")}
                        disabled={isJobSelected}
                    />
                    <InputField
                        label="Sueldo Base (Declarado)"
                        type="number"
                        step="0.01"
                        placeholder="130.00"
                        {...register('base_salary_bs', { required: 'Requerido' })}
                        helperText="Monto en Bolívares para recibos de ley"
                        className={cn(isJobSelected && "bg-gray-50 text-gray-400 cursor-not-allowed")}
                        disabled={isJobSelected}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5 relative z-10">
                    <SelectField
                        label="Moneda Referencia"
                        {...register('salary_currency')}
                        options={[
                            { value: 'USD', label: 'USD (Dólar)' },
                            { value: 'VES', label: 'VES (Bolívar)' }
                        ]}
                        disabled={isJobSelected}
                    />
                    <SelectField
                        label="Frecuencia de Pago"
                        {...register('payment_frequency')}
                        options={[
                            { value: 'BIWEEKLY', label: 'Quincenal' },
                            { value: 'WEEKLY', label: 'Semanal' },
                            { value: 'MONTHLY', label: 'Mensual' }
                        ]}
                    />
                    <InputField
                        label="Retención ISLR (%)"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0.00"
                        icon={Percent}
                        {...register('islr_retention_percentage')}
                        className="font-bold text-amber-600"
                    />
                </div>
            </section>

            {/* 3. UBICACIÓN ORGANIZACIONAL */}
            <section>
                <SectionHeader icon={Building2} title="Ubicación Organizacional" />
                <div className="space-y-4">
                    <SelectField
                        label="Sede / Sucursal"
                        {...register('branch')}
                        disabled={!!employeeData?.branch}
                        options={[
                            { value: '', label: '-- Seleccionar Sede --' },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Departamento</label>
                            <Controller
                                name="department"
                                control={control}
                                render={({ field }) => (
                                    <DepartmentSelector
                                        branchId={watchedValues.branch}
                                        value={field.value}
                                        onChange={(val) => {
                                            field.onChange(val);
                                            // Reset dependents
                                        }}
                                        disabled={!!employeeData?.department || !watchedValues.branch}
                                    />
                                )}
                            />
                        </div>

                        <div className="space-y-1">
                            <Controller
                                name="job_position"
                                control={control}
                                render={({ field }) => (
                                    <SelectField
                                        label="Cargo Estructurado"
                                        icon={Briefcase}
                                        {...field}
                                        disabled={!watchedValues.department}
                                        options={[
                                            { value: '', label: watchedValues.department ? '-- Seleccionar Cargo --' : 'Seleccione Dpto.' },
                                            ...jobPositions.map(pos => ({ value: pos.id, label: pos.name }))
                                        ]}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            handleJobPositionChange(e);
                                        }}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputField
                            label="Cargo (Título en Recibo)"
                            placeholder="Ej. Gerente General"
                            {...register('position')}
                        />
                        <InputField
                            label="Horario de Trabajo"
                            placeholder="Lunes a Viernes..."
                            {...register('work_schedule')}
                        />
                    </div>
                </div>
            </section>
        </form>
    );
};

const SectionHeader = ({ icon: Icon, title, className }) => (
    <h4 className={cn("text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 mb-4", className)}>
        {Icon && <Icon size={14} className="text-nominix-electric opacity-60" />}
        {title}
    </h4>
);

// --- MAIN COMPONENT ---

const UpsertContractModal = ({ isOpen, onClose, onSuccess, employeeId, employeeData, contractToEdit = null }) => {
    // Hooks Globales
    const { data: companyConfig } = useCompanyConfig({ enabled: isOpen });
    const { data: branches = [] } = useBranches({ enabled: isOpen });
    const { data: bcvRate = 60.00, isLoading: isLoadingRate } = useExchangeRate({ enabled: isOpen });

    // React Hook Form
    const { register, control, handleSubmit, watch, setValue, reset, formState } = useForm({
        defaultValues: {
            contract_type: 'INDEFINITE',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            salary_amount: '',
            base_salary_bs: '130',
            salary_currency: 'USD',
            payment_frequency: 'BIWEEKLY',
            position: '',
            branch: '',
            department: '',
            job_position: '',
            work_schedule: 'Lunes a Viernes 8:00 AM - 5:00 PM',
            notes: '',
            islr_retention_percentage: '0'
        }
    });

    const watchedValues = watch();
    const selectedDepartment = watchedValues.department;

    // Hooks Dependientes
    const { data: jobPositions = [] } = useJobPositions(
        typeof selectedDepartment === 'object' ? selectedDepartment.id : selectedDepartment,
        { enabled: !!selectedDepartment }
    );

    // Mutations
    const createContractMutation = useCreateContract();
    const updateContractMutation = useUpdateContract();

    // Custom Logic Hook
    const simulation = useSalarySimulation(control, bcvRate, companyConfig, setValue, !!watchedValues.job_position);

    // --- EFFECTS & HANDLERS ---

    useEffect(() => {
        if (isOpen) {
            if (contractToEdit) {
                reset({
                    ...contractToEdit,
                    end_date: contractToEdit.end_date || '',
                    branch: contractToEdit.branch?.id || contractToEdit.branch || '',
                    department: contractToEdit.department?.id || contractToEdit.department || '',
                    job_position: contractToEdit.job_position?.id || contractToEdit.job_position || '',
                    notes: contractToEdit.notes || '',
                    base_salary_bs: contractToEdit.base_salary_bs || '130',
                    islr_retention_percentage: contractToEdit.islr_retention_percentage || '0'
                });
            } else {
                reset({
                    contract_type: 'INDEFINITE',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: '',
                    salary_amount: '',
                    base_salary_bs: '130',
                    salary_currency: 'USD',
                    payment_frequency: 'BIWEEKLY',
                    position: '',
                    branch: employeeData?.branch?.id || employeeData?.branch || '',
                    department: employeeData?.department?.id || employeeData?.department || '',
                    job_position: '',
                    work_schedule: 'Lunes a Viernes 8:00 AM - 5:00 PM',
                    notes: '',
                    islr_retention_percentage: '0'
                });
            }
        }
    }, [isOpen, contractToEdit, employeeData, reset]);

    const handleJobPositionChange = useCallback((e) => {
        const val = e.target.value;
        const job = jobPositions.find(j => j.id == val);

        setValue('job_position', val);

        if (job) {
            setValue('position', job.name);
            const totalSalary = parseFloat(job.default_total_salary || 0);
            let calculatedBaseBs = 130;

            if (companyConfig && totalSalary > 0) {
                const currentRate = bcvRate || 1;
                const splitMode = companyConfig.salary_split_mode || 'PERCENTAGE';

                if (splitMode === 'PERCENTAGE') {
                    const pct = parseFloat(companyConfig.split_percentage_base) || 30;
                    calculatedBaseBs = (totalSalary * currentRate * (pct / 100));
                } else if (splitMode === 'FIXED_BASE') {
                    const fixedBaseUsd = parseFloat(companyConfig.split_fixed_amount) || 0;
                    calculatedBaseBs = fixedBaseUsd * currentRate;
                } else if (splitMode === 'FIXED_BONUS') {
                    const fixedBonusUsd = parseFloat(companyConfig.split_fixed_amount) || 0;
                    const baseUsd = totalSalary - fixedBonusUsd;
                    calculatedBaseBs = baseUsd > 0 ? (baseUsd * currentRate) : 130;
                }
            }

            setValue('salary_amount', totalSalary);
            setValue('base_salary_bs', calculatedBaseBs.toFixed(2));
            setValue('salary_currency', job.currency?.code || job.currency || 'USD');
        }
    }, [jobPositions, companyConfig, bcvRate, setValue]);

    const onSubmit = async (data) => {
        if (data.contract_type !== 'INDEFINITE' && !data.end_date) {
            toast.error("La fecha de fin es obligatoria para este contracto");
            return;
        }

        const payload = {
            ...data,
            employee: employeeId,
            department: data.department
        };

        if (employeeData?.branch && !payload.branch) {
            payload.branch = employeeData.branch.id || employeeData.branch;
        }
        if (!payload.end_date) payload.end_date = null;

        try {
            if (contractToEdit) {
                await updateContractMutation.mutateAsync({ id: contractToEdit.id, ...payload });
                toast.success("Contrato actualizado exitosamente");
            } else {
                await createContractMutation.mutateAsync(payload);
                toast.success("Contrato registrado exitosamente");
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error guardando el contrato");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={contractToEdit ? 'Editar Contrato Laboral' : 'Nuevo Contrato Laboral'}
            size="5xl"
        >
            <div className="flex flex-col lg:flex-row gap-8 p-2">
                <ContractForm
                    register={register}
                    control={control}
                    errors={formState.errors}
                    watchedValues={watchedValues}
                    jobPositions={jobPositions}
                    branches={branches}
                    employeeData={employeeData}
                    handleJobPositionChange={handleJobPositionChange}
                    formState={formState}
                />

                <SalarySimulator
                    simulation={simulation}
                    bcvRate={bcvRate}
                    isLoadingRate={isLoadingRate}
                    isSubmitting={createContractMutation.isPending || updateContractMutation.isPending}
                />

                {/* Hidden button to close from simulator */}
                <button id="close-modal-btn" className="hidden" onClick={onClose}></button>
            </div>
        </Modal>
    );
};

export default UpsertContractModal;