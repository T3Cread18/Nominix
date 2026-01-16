import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCompanyConfig, useUpdateCompanyConfig } from '../../../hooks/useOrganization';
import { Button, Card, InputField, SelectField, ToggleField } from '../../../components/ui';
import { SkeletonForm } from '../../../components/ui/Skeleton';
import { Building2, Save, DollarSign } from 'lucide-react';

const CompanyForm = () => {
    const { data: company, isLoading } = useCompanyConfig();
    const { mutate: updateConfig, isPending: isSaving } = useUpdateCompanyConfig();

    const { register, handleSubmit, watch, reset, setValue } = useForm();
    const salarySplitMode = watch('salary_split_mode');

    // Cargar datos al formulario cuando llegan del hook
    useEffect(() => {
        if (company) {
            reset(company);
        }
    }, [company, reset]);

    const onSubmit = (data) => {
        updateConfig(data);
    };

    if (isLoading) {
        return <SkeletonForm fields={6} />;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda: Logo y Resumen */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="flex flex-col items-center text-center relative overflow-hidden group !p-8">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-50 to-white z-0" />
                    <div className="relative z-10 w-32 h-32 rounded-full bg-white border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-500 cursor-pointer overflow-hidden">
                        <Building2 size={48} className="text-slate-300 group-hover:text-nominix-electric transition-colors" />
                    </div>
                    <h3 className="text-lg font-black text-nominix-dark relative z-10">
                        {watch('name') || 'Sin Nombre'}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 relative z-10">
                        {watch('rif') || 'J-...'}
                    </p>
                </Card>
            </div>

            {/* Columna Derecha: Campos */}
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <Card.Section title="Identidad Fiscal & Parametrización">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <InputField
                                label="Razón Social"
                                {...register('name', { required: true })}
                            />
                            <InputField
                                label="RIF"
                                {...register('rif', { required: true })}
                            />
                            <div className="md:col-span-2 lg:col-span-1 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                <InputField
                                    label="Salario Mínimo Nacional (Bs.)"
                                    type="number"
                                    step="0.01"
                                    {...register('national_minimum_salary')}
                                />
                                <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mt-2 px-3">
                                    <DollarSign size={10} className="inline mr-1" /> Base para topes de IVSS y RPE
                                </p>
                            </div>
                        </div>
                    </Card.Section>

                    {/* Nueva Sección: Estrategia Salarial */}
                    <Card.Section title="Estrategia de Retribución">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SelectField
                                label="Modo de División Salarial"
                                {...register('salary_split_mode')}
                                options={[
                                    { value: 'PERCENTAGE', label: 'Por Porcentaje' },
                                    { value: 'FIXED_BASE', label: 'Base Fija (Monto)' },
                                    { value: 'FIXED_BONUS', label: 'Bono Fijo (Monto)' }
                                ]}
                            />

                            {salarySplitMode === 'PERCENTAGE' && (
                                <InputField
                                    label="% Salario Base"
                                    type="number"
                                    step="0.01"
                                    placeholder="Ej: 30.00"
                                    {...register('split_percentage_base')}
                                />
                            )}

                            {(salarySplitMode === 'FIXED_BASE' || salarySplitMode === 'FIXED_BONUS') && (
                                <InputField
                                    label="Monto Fijo Referencia"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...register('split_fixed_amount')}
                                />
                            )}

                            <div className="md:col-span-3 lg:col-span-3 text-[10px] text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                                {salarySplitMode === 'PERCENTAGE' && `El ${watch('split_percentage_base') || 0}% del Ingreso Total será Salario Base, el resto será Bono.`}
                                {salarySplitMode === 'FIXED_BASE' && `El Salario Base será fijo (${watch('split_fixed_amount') || 0}), todo excedente será Bono.`}
                                {salarySplitMode === 'FIXED_BONUS' && `El Bono será fijo (${watch('split_fixed_amount') || 0}), todo excedente será Salario Base.`}
                            </div>
                        </div>
                    </Card.Section>

                    {/* Visibilidad en Recibos */}
                    <Card.Section title="Visibilidad en Recibos PDF">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ToggleField
                                label="Mostrar Sueldo Base"
                                {...register('show_base_salary')}
                            />
                            <ToggleField
                                label="Mostrar Complemento"
                                {...register('show_supplement')}
                            />
                            <ToggleField
                                label="Mostrar Cestaticket"
                                {...register('show_tickets')}
                            />
                        </div>
                    </Card.Section>
                </Card>

                <Card>
                    <Card.Section title="Frecuencias de Pago">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SelectField
                                label="Frecuencia Nómina Salarial"
                                {...register('payroll_journey')}
                                options={[
                                    { value: 'WEEKLY', label: 'Semanal' },
                                    { value: 'BIWEEKLY', label: 'Quincenal' },
                                    { value: 'MONTHLY', label: 'Mensual' }
                                ]}
                            />
                            <SelectField
                                label="Frecuencia Cestaticket"
                                {...register('cestaticket_journey')}
                                options={[
                                    { value: 'MONTHLY', label: 'Mensual (Fecha única)' },
                                    { value: 'PERIODIC', label: 'Proporcional cada pago' }
                                ]}
                            />
                            {watch('cestaticket_journey') === 'MONTHLY' && (
                                <InputField
                                    label="Día de Pago Cestaticket"
                                    type="number"
                                    placeholder="Ej: 30"
                                    {...register('cestaticket_payment_day')}
                                />
                            )}
                        </div>
                    </Card.Section>
                </Card>

                <Card>
                    <Card.Section title="Ubicación & Contacto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-[9px] font-black uppercase text-gray-400 pl-3 mb-1 block tracking-wider">Dirección Fiscal</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-sm text-nominix-dark outline-none resize-none h-24 focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 transition-all duration-300"
                                    {...register('address')}
                                />
                            </div>
                            <InputField label="Teléfono" {...register('phone')} />
                            <InputField label="Email" {...register('email')} />
                            <InputField label="Ciudad" {...register('city')} />
                            <InputField label="Estado" {...register('state')} />
                        </div>
                    </Card.Section>
                </Card>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        loading={isSaving}
                        size="lg"
                        icon={Save}
                    >
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default CompanyForm;
