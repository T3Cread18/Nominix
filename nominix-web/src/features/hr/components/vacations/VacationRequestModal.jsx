import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Modal, { ModalFooter } from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import InputField from '../../../../components/ui/InputField';
import { Calendar, Briefcase } from 'lucide-react';
import vacationsService from '../../../../services/vacations.service';
import variationsService from '../../../../services/variations.service';

const VacationRequestModal = ({ isOpen, onClose, employeeId }) => {
    const queryClient = useQueryClient();
    const [calculation, setCalculation] = useState(null);

    const { control, handleSubmit, watch, reset } = useForm({
        defaultValues: {
            start_date: new Date().toISOString().split('T')[0],
            days: 15
        }
    });

    // Watch fields for automatic calculation
    const startDate = watch('start_date');
    const days = watch('days');

    // 1. Calculate End Date Logic
    useEffect(() => {
        const calculateDates = async () => {
            if (!startDate || !days) return;

            try {
                const result = await vacationsService.calculateEndDate(startDate, days);
                setCalculation(result);
            } catch (error) {
                console.error("Error calculating dates:", error);
                setCalculation(null);
            }
        };

        const timer = setTimeout(() => {
            calculateDates();
        }, 300); // Debounce

        return () => clearTimeout(timer);
    }, [startDate, days]);

    // 2. Submit Logic (Create Variation)
    const { mutate: createVariation, isPending } = useMutation({
        mutationFn: async (data) => {
            // Buscamos la causa de VACATION
            const causes = await variationsService.getCauses();
            const vacationCause = causes.find(c => c.category === 'VACATION');

            if (!vacationCause) {
                throw new Error("No existe una causa de variación configurada como 'Vacaciones'");
            }

            // Usamos la fecha fin calculada por el backend si existe, o la calculamos
            // Nota: variationsService espera un objeto employee_variation
            if (!calculation) throw new Error("Error calculando fechas. Verifique los datos.");

            return variationsService.createEmployeeVariation({
                employee: employeeId,
                cause: vacationCause.code || vacationCause.id,
                start_date: data.start_date,
                end_date: calculation.end_date, // Usamos la fecha calculada
                notes: `Vacaciones solicitadas: ${data.days} días hábiles.`
            });
        },
        onSuccess: () => {
            toast.success("Solicitud de vacaciones registrada exitosamente.");
            queryClient.invalidateQueries(['vacation-balances', employeeId]);
            queryClient.invalidateQueries(['employee-variations', employeeId]); // También actualizamos incidencias
            onClose();
            reset();
            setCalculation(null);
        },
        onError: (err) => {
            toast.error(err.message || "Error al registrar solicitud");
        }
    });

    const onSubmit = (data) => {
        createVariation(data);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Solicitar Vacaciones"
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Controller
                        name="start_date"
                        control={control}
                        render={({ field }) => (
                            <InputField
                                label="Desde (Inicio)"
                                type="date"
                                {...field}
                            />
                        )}
                    />

                    <Controller
                        name="days"
                        control={control}
                        render={({ field }) => (
                            <InputField
                                label="Días Hábiles"
                                type="number"
                                min={1}
                                max={30}
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                        )}
                    />
                </div>

                {/* Previsualización del Cálculo */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    {calculation ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Regresa el:</span>
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Briefcase size={14} className="text-green-600" />
                                    {/* Formato local simple o directo del string */}
                                    {calculation.return_to_work_date}
                                </span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-400 block">Fin Periodo</span>
                                    <span className="font-medium text-slate-700">{calculation.end_date}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-400 block">Días Calendario</span>
                                    <span className="font-medium text-slate-700">{calculation.calendar_days} días</span>
                                </div>
                            </div>
                            <div className="mt-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2">
                                <Calendar size={12} />
                                <span>Se descontarán {days} días hábiles de su saldo.</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">
                            Calculando fechas...
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button
                        type="submit"
                        loading={isPending}
                        disabled={!calculation}
                        variant="dark"
                    >
                        Confirmar Solicitud
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default VacationRequestModal;
