import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Briefcase, Calendar, DollarSign, Building2, Calculator, Save, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Hooks
import { useCompanyConfig, useBranches, useJobPositions } from '../../../hooks/useOrganization';
import { useCreateContract, useUpdateContract, useExchangeRate } from '../../../hooks/useLabor';

// UI Components
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';
import DepartmentSelector from '../../../components/DepartmentSelector'; // Legacy selector helper, keep for now

const UpsertContractModal = ({ isOpen, onClose, onSuccess, employeeId, employeeData, contractToEdit = null }) => {
    // 1. Hooks de Datos Globales
    const { data: companyConfig } = useCompanyConfig({ enabled: isOpen });
    const { data: branches = [] } = useBranches({ enabled: isOpen });
    const { data: bcvRate = 60.00, isLoading: isLoadingRate } = useExchangeRate({ enabled: isOpen });

    // 2. React Hook Form
    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
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
            notes: ''
        }
    });

    // Watchers para calculos
    const watchedValues = watch();
    const selectedDepartment = watchedValues.department;

    // 3. Hooks dependientes (Cargos)
    const { data: jobPositions = [] } = useJobPositions(
        typeof selectedDepartment === 'object' ? selectedDepartment.id : selectedDepartment,
        { enabled: !!selectedDepartment }
    );

    // 4. Mutations
    const createContractMutation = useCreateContract();
    const updateContractMutation = useUpdateContract();

    const isSubmitting = createContractMutation.isPending || updateContractMutation.isPending;

    // --- EFECTOS ---

    // Inicializar Formulario al abrir
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
                    base_salary_bs: contractToEdit.base_salary_bs || '130'
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
                    notes: ''
                });
            }
        }
    }, [isOpen, contractToEdit, employeeData, reset]);


    // Manejo inteligente de cambio de cargo
    const handleJobPositionChange = (e) => {
        const val = e.target.value;
        const job = jobPositions.find(j => j.id == val);

        setValue('job_position', val);

        if (job) {
            // Auto-fill nombre del cargo
            setValue('position', job.name);

            // Auto-calculate base from job defaults
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
    };


    // --- CÁLCULO DE SIMULACIÓN ---
    const simulation = useMemo(() => {
        const totalPackageUsd = parseFloat(watchedValues.salary_amount) || 0;
        const baseBs = parseFloat(watchedValues.base_salary_bs) || 0;
        const currentRate = bcvRate || 1;
        const MONTO_CESTATICKET_USD = 40.00;

        const totalPackageBs = totalPackageUsd * currentRate;
        const cestaTicketBs = MONTO_CESTATICKET_USD * currentRate;

        let complementoBs = totalPackageBs - baseBs - cestaTicketBs;
        if (complementoBs < 0) complementoBs = 0;

        return { totalPackageBs, cestaTicketBs, complementoBs, baseBs };
    }, [watchedValues.salary_amount, watchedValues.base_salary_bs, bcvRate]);


    // --- SUBMIT ---
    const onSubmit = async (data) => {
        if (data.contract_type !== 'INDEFINITE' && !data.end_date) {
            toast.error("La fecha de fin es obligatoria para este tipo de contrato");
            return;
        }

        const payload = {
            ...data,
            employee: employeeId,
            department: data.department
        };

        // Si el empleado tiene branch legacy, usarla
        if (employeeData?.branch && !payload.branch) {
            payload.branch = employeeData.branch.id || employeeData.branch;
        }

        if (!payload.end_date) payload.end_date = null;

        try {
            if (contractToEdit) {
                await updateContractMutation.mutateAsync({ id: contractToEdit.id, ...payload });
                toast.success("Contrato actualizado");
            } else {
                await createContractMutation.mutateAsync(payload);
                toast.success("Contrato registrado");
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
            title={contractToEdit ? 'Editar Contrato' : 'Nuevo Contrato'}
            size="4xl"
        >
            <div className="flex flex-col md:flex-row gap-6 p-1">
                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                <form id="contract-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo de Contrato */}
                        <SelectField
                            label="Tipo de Contrato"
                            {...register('contract_type')}
                            options={[
                                { value: 'INDEFINITE', label: 'Tiempo Indeterminado' },
                                { value: 'FIXED_TERM', label: 'Tiempo Determinado' },
                                { value: 'PROJECT', label: 'Por Obra Determinada' }
                            ]}
                        />

                        {/* Fechas */}
                        <InputField
                            label="Fecha Inicio"
                            type="date"
                            icon={Calendar}
                            {...register('start_date', { required: 'Requerido' })}
                            error={errors.start_date?.message}
                        />

                        {watchedValues.contract_type !== 'INDEFINITE' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <InputField
                                    label="Fecha Fin"
                                    type="date"
                                    icon={Calendar}
                                    {...register('end_date')}
                                    className="bg-blue-50/50 border-blue-100"
                                />
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN SALARIAL */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-4">
                        <h4 className="text-xs font-black uppercase text-nominix-electric tracking-widest flex items-center gap-2">
                            <DollarSign size={14} /> Esquema Salarial
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Total Paquete ($)"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                icon={DollarSign}
                                {...register('salary_amount', { required: 'Requerido' })}
                                error={errors.salary_amount?.message}
                                className="text-lg font-black"
                            />

                            <InputField
                                label="Sueldo Base (Bs)"
                                type="number"
                                step="0.01"
                                placeholder="130.00"
                                {...register('base_salary_bs', { required: 'Requerido' })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                label="Moneda Referencia"
                                {...register('salary_currency')}
                                options={[
                                    { value: 'USD', label: 'USD (Dólar)' },
                                    { value: 'VES', label: 'VES (Bolívar)' }
                                ]}
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
                        </div>
                    </div>

                    {/* ESTRUCTURA ORGANIZATIVA */}
                    <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                            <Building2 size={14} /> Ubicación
                        </h4>

                        {/* Sede */}
                        <SelectField
                            label="Sede / Sucursal"
                            icon={Building2}
                            {...register('branch')}
                            disabled={!!employeeData?.branch} // Bloqueado si el empleado ya tiene sede
                            options={[
                                { value: '', label: '-- Seleccionar Sede --' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            onChange={(e) => {
                                setValue('branch', e.target.value);
                                setValue('department', '');
                                setValue('job_position', '');
                                setValue('position', '');
                            }}
                        />

                        {/* Departamento (Custom Component por ahora) */}
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
                                            setValue('job_position', '');
                                            setValue('position', '');
                                        }}
                                        disabled={!!employeeData?.department || !watchedValues.branch}
                                    />
                                )}
                            />
                        </div>

                        {/* Cargo Estructurado */}
                        <div className="space-y-1">
                            <SelectField
                                label="Cargo Estructurado"
                                icon={Briefcase}
                                {...register('job_position')}
                                disabled={!watchedValues.department}
                                options={[
                                    { value: '', label: watchedValues.department ? '-- Seleccionar Cargo --' : 'Departamento Requerido' },
                                    ...jobPositions.map(pos => ({ value: pos.id, label: pos.name }))
                                ]}
                                onChange={handleJobPositionChange}
                            />
                        </div>

                        <InputField
                            label="Cargo (Texto en Recibo)"
                            placeholder="Ej. Gerente de Operaciones"
                            {...register('position')}
                        />

                        <InputField
                            label="Horario"
                            placeholder="Lunes a Viernes..."
                            {...register('work_schedule')}
                        />
                    </div>
                </form>

                {/* COLUMNA DERECHA: SIMULADOR */}
                <div className="w-full md:w-[280px] bg-slate-50 p-6 rounded-2xl border border-gray-100 flex flex-col h-full sticky top-0">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                        <Calculator size={14} /> Simulación
                    </h4>

                    {isLoadingRate ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="animate-spin" size={24} />
                            <p className="text-[10px] mt-2">Consultando Tasa...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in">
                            <SummaryCard label="Sueldo Base" amount={simulation.baseBs} note="Incide Prestaciones" noteColor="text-green-600" />
                            <SummaryCard label="Cestaticket" amount={simulation.cestaTicketBs} note="Valor de Ley ($40)" />
                            <SummaryCard
                                label="Complemento"
                                amount={simulation.complementoBs}
                                note="Bono No Salarial"
                                highlight
                            />

                            <div className="border-t border-gray-200 my-2"></div>

                            <div className="p-3 bg-blue-50/50 rounded-xl flex gap-2 items-start border border-blue-100/50">
                                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[9px] text-blue-600 leading-relaxed">
                                    Cálculo oficial BCV: <strong>Bs. {bcvRate.toFixed(2)}</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-6 flex flex-col gap-3">
                        <Button
                            type="submit"
                            form="contract-form"
                            variant="electric"
                            className="w-full justify-center"
                            isLoading={isSubmitting}
                            icon={Save}
                        >
                            Guardar Contrato
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="w-full justify-center"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// Helper component local
const SummaryCard = ({ label, amount, note, noteColor = "text-gray-400", highlight = false }) => (
    <div className={`p-3 rounded-xl border shadow-sm ${highlight ? 'bg-nominix-electric/5 border-nominix-electric/30' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-start mb-1">
            <span className={`text-[9px] font-black uppercase ${highlight ? 'text-nominix-electric' : 'text-slate-500'}`}>{label}</span>
            <span className={`text-xs font-bold ${highlight ? 'text-nominix-electric' : 'text-slate-800'}`}>Bs. {amount.toLocaleString()}</span>
        </div>
        <p className={`text-[8px] ${noteColor}`}>{note}</p>
    </div>
);

export default UpsertContractModal;