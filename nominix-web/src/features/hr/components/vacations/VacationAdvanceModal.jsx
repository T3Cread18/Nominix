import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Modal, { ModalFooter } from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import { AlertTriangle, Banknote, Calendar } from 'lucide-react';
import vacationsService from '../../../../services/vacations.service';

const VacationAdvanceModal = ({ isOpen, onClose, balance }) => {
    const queryClient = useQueryClient();

    const { mutate: generateAdvance, isPending } = useMutation({
        mutationFn: () => vacationsService.generateAdvance(balance.id),
        onSuccess: (data) => {
            toast.success("Pago anticipado generado exitosamente.");
            queryClient.invalidateQueries(['vacation-balances']);
            onClose();
        },
        onError: (err) => {
            toast.error("Error generando anticipo: " + (err.response?.data?.detail || err.message));
        }
    });

    if (!balance) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generar Pago Anticipado"
            size="md"
        >
            <div className="space-y-6">
                {/* Warning Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                    <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="font-bold mb-1">Acción Irreversible</p>
                        <p>
                            Esta acción generará un <strong>Recibo de Pago</strong> inmediato y registrará
                            una <strong>Deducción (Préstamo)</strong> que se descontará en futuras nóminas
                            para compensar el anticipo.
                        </p>
                    </div>
                </div>

                {/* Balance Details */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Periodo</span>
                        <span className="font-medium text-slate-800">
                            {balance.period_start} - {balance.period_end}
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Calendar size={16} />
                            <span>Días de Disfrute</span>
                        </div>
                        <span className="font-bold text-slate-900 text-lg">
                            {balance.entitled_vacation_days}
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Banknote size={16} />
                            <span>Días de Bono</span>
                        </div>
                        <span className="font-bold text-slate-900 text-lg">
                            {balance.entitled_bonus_days}
                        </span>
                    </div>

                    {(balance.entitled_vacation_days + balance.entitled_bonus_days) <= 0 && (
                        <div className="text-xs text-red-500 text-right font-medium">
                            No hay días disponibles para pagar.
                        </div>
                    )}
                </div>

                <div className="text-xs text-center text-slate-400">
                    Se generará el recibo con fecha de hoy.
                </div>
            </div>

            <ModalFooter>
                <div className="flex justify-end gap-2 w-full">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary" // Changed from dark to primary for emphasis on action? or stick to dark
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => generateAdvance()}
                        loading={isPending}
                        disabled={
                            (balance.entitled_vacation_days + balance.entitled_bonus_days) <= 0
                        }
                        icon={Banknote}
                    >
                        Confirmar Pago
                    </Button>
                </div>
            </ModalFooter>
        </Modal>
    );
};

export default VacationAdvanceModal;
