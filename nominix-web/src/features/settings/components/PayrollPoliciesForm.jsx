import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { usePayrollPolicies, useUpdatePayrollPolicies } from '../../../hooks/useOrganization';
import { Button, Card, InputField } from '../../../components/ui';
import { SkeletonForm } from '../../../components/ui/Skeleton';
import { Save, Calculator, Clock, Percent, Info } from 'lucide-react';

const PayrollPoliciesForm = () => {
    const { data: policies, isLoading } = usePayrollPolicies();
    const { mutate: updatePolicies, isPending: isSaving } = useUpdatePayrollPolicies();

    const { register, handleSubmit, reset } = useForm();

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
