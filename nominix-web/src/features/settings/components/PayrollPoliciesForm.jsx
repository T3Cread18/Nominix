import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { usePayrollPolicies, useUpdatePayrollPolicies } from '../../../hooks/useOrganization';
import { Button, Card, InputField, SelectField, Checkbox } from '../../../components/ui';
import { SkeletonForm } from '../../../components/ui/Skeleton';
import { Save, Calculator, Clock, Percent, Info, Palmtree, Gift, Calendar } from 'lucide-react';

const PayrollPoliciesForm = () => {
    const { data: policies, isLoading } = usePayrollPolicies();
    const { mutate: updatePolicies, isPending: isSaving } = useUpdatePayrollPolicies();

    const { register, handleSubmit, reset, watch } = useForm();

    useEffect(() => {
        if (policies) {
            reset(policies);
        }
    }, [policies, reset]);

    const onSubmit = (data) => {
        updatePolicies(data);
    };

    if (isLoading) return <SkeletonForm fields={4} />;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <Card className="!p-8">
                    <h3 className="text-lg font-black text-nominix-dark mb-2">Factores Globales</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Define los multiplicadores matemáticos que usará el motor de nómina para calcular conceptos variables como horas extras, feriados y bonos.
                    </p>
                    <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Percent size={12} /> Ejemplo de Cálculo
                        </p>
                        <p className="text-xs text-blue-800 font-medium">
                            Si el salario diario es <strong>100 Bs</strong> y el factor de feriado es <strong>3.00</strong>:
                            <br />
                            <span className="block mt-2 font-mono text-xs bg-white/50 p-2 rounded border border-blue-100/50">
                                Pago = 100 * 3.00 = 300 Bs
                            </span>
                        </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                        <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 font-medium">
                            Los cambios en estos factores afectarán inmediatamente al próximo cálculo de nómina.
                        </p>
                    </div>
                </Card>

                {/* Info Vacaciones */}
                <Card className="!p-8">
                    <h3 className="text-lg font-black text-nominix-dark mb-2">Vacaciones LOTTT</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Configura los parámetros de vacaciones según la Ley Orgánica del Trabajo. Los valores por defecto corresponden a los mínimos legales.
                    </p>
                    <div className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Palmtree size={12} /> Art. 190 LOTTT
                        </p>
                        <p className="text-xs text-green-800 font-medium">
                            15 días el primer año, +1 día por año adicional, máximo 30 días.
                        </p>
                    </div>
                    <div className="mt-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Gift size={12} /> Art. 192 LOTTT
                        </p>
                        <p className="text-xs text-purple-800 font-medium">
                            Bono vacacional: 15 días + 1 por año, máximo 30 días.
                        </p>
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <Card.Section
                        title="Factores de Días Especiales"
                        icon={Calculator}
                        description="Multiplicadores para trabajo en días no laborables"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Factor Feriados / Domingos"
                                type="number" step="0.01"
                                placeholder="Ej: 3.00"
                                {...register('holiday_payout_factor', { valueAsNumber: true })}
                            />
                            <InputField
                                label="Factor Descanso Trabajado"
                                type="number" step="0.01"
                                placeholder="Ej: 1.50"
                                {...register('rest_day_payout_factor', { valueAsNumber: true })}
                            />
                        </div>
                    </Card.Section>
                </Card>

                <Card>
                    <Card.Section
                        title="Recargos de Horas"
                        icon={Clock}
                        description="Tasas para cálculo de sobretiempo y bonos nocturnos"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField
                                label="Recargo H.E. Diurna"
                                type="number" step="0.01"
                                placeholder="Ej: 1.50"
                                {...register('overtime_day_factor', { valueAsNumber: true })}
                            />
                            <InputField
                                label="Recargo H.E. Nocturna"
                                type="number" step="0.01"
                                placeholder="Ej: 1.50"
                                {...register('overtime_night_factor', { valueAsNumber: true })}
                            />
                            <InputField
                                label="Tasa Bono Nocturno"
                                type="number" step="0.01"
                                placeholder="Ej: 0.30"
                                {...register('night_bonus_rate', { valueAsNumber: true })}
                            />
                        </div>
                    </Card.Section>
                </Card>

                {/* Sección de Vacaciones */}
                <Card>
                    <Card.Section
                        title="Días de Vacaciones"
                        icon={Palmtree}
                        description="Parámetros base según LOTTT Art. 190"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField
                                label="Días Base (1er Año)"
                                type="number" step="1" min="1"
                                placeholder="15"
                                hint="Días correspondientes al primer año"
                                {...register('vacation_days_base', { valueAsNumber: true })}
                            />
                            <InputField
                                label="Días Adicionales/Año"
                                type="number" step="1" min="0"
                                placeholder="1"
                                hint="Días extra por cada año de servicio"
                                {...register('vacation_days_per_year', { valueAsNumber: true })}
                            />
                            <InputField
                                label="Máximo Días Adicionales"
                                type="number" step="1" min="0"
                                placeholder="15"
                                hint="Tope máximo acumulable (total: base + máx)"
                                {...register('vacation_days_max', { valueAsNumber: true })}
                            />
                        </div>
                    </Card.Section>
                </Card>

                <Card>
                    <Card.Section
                        title="Bono Vacacional"
                        icon={Gift}
                        description="Parámetros según LOTTT Art. 192"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Días Bono (1er Año)"
                                type="number" step="1" min="1"
                                placeholder="15"
                                hint="Días de bono para el primer año"
                                {...register('vacation_bonus_days_base', { valueAsNumber: true })}
                            />
                            <InputField
                                label="Máximo Días Bono"
                                type="number" step="1" min="1"
                                placeholder="30"
                                hint="Tope máximo de días de bono"
                                {...register('vacation_bonus_days_max', { valueAsNumber: true })}
                            />
                        </div>
                    </Card.Section>
                </Card>

                <Card>
                    <Card.Section
                        title="Opciones Adicionales"
                        icon={Calendar}
                        description="Configuración avanzada de vacaciones"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Meses Mínimos para Derecho"
                                type="number" step="1" min="1"
                                placeholder="12"
                                hint="Antigüedad mínima en meses"
                                {...register('min_service_months', { valueAsNumber: true })}
                            />
                            <SelectField
                                label="Modo de Acumulación"
                                {...register('accrual_mode')}
                            >
                                <option value="ANNUAL">Anual (al cumplir cada año)</option>
                                <option value="MONTHLY">Mensual Proporcional</option>
                                <option value="PROPORTIONAL">Proporcional a Días Trabajados</option>
                            </SelectField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-gray-300 text-nominix-primary focus:ring-nominix-primary"
                                    {...register('pay_rest_days')}
                                />
                                <span className="text-sm text-gray-700 group-hover:text-nominix-dark">
                                    Incluir Sábados/Domingos en pago
                                </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-gray-300 text-nominix-primary focus:ring-nominix-primary"
                                    {...register('pay_holidays')}
                                />
                                <span className="text-sm text-gray-700 group-hover:text-nominix-dark">
                                    Incluir Feriados Nacionales en pago
                                </span>
                            </label>
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
                        Guardar Políticas
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default PayrollPoliciesForm;

