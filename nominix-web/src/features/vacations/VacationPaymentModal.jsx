import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import VacationPaymentPreview from './VacationPaymentPreview';
import vacationService from '../../services/vacation.service';

/**
 * VacationPaymentModal - Modal para procesar pago de vacaciones.
 * 
 * Flujo:
 * 1. Al abrir, carga simulación completa desde el backend
 * 2. Muestra vista previa con VacationPaymentPreview
 * 3. Usuario puede cancelar o procesar el pago
 * 4. Al procesar, crea VacationPayment y cambia estado a PROCESSED
 * 
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Callback al cerrar
 * @param {object} vacationRequest - Solicitud de vacaciones a procesar
 * @param {function} onSuccess - Callback al procesar exitosamente
 */
const VacationPaymentModal = ({
    isOpen,
    onClose,
    vacationRequest,
    onSuccess,
}) => {
    // States
    const [simulation, setSimulation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    // Date state (default today)
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    // Cargar simulación al abrir
    // Cargar simulación al abrir o cambiar fecha
    useEffect(() => {
        if (isOpen && vacationRequest?.id) {
            loadSimulation();
        } else {
            // Reset states cuando se cierra
            setSimulation(null);
            setError(null);
            setSuccess(false);
            setPaymentDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, vacationRequest?.id, paymentDate]);

    const loadSimulation = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await vacationService.simulateCompletePayment(vacationRequest.id, paymentDate);
            setSimulation(data);
        } catch (err) {
            console.error('Error loading simulation:', err);
            setError(err.response?.data?.error || 'Error al cargar la simulación');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessPayment = async () => {
        try {
            setProcessing(true);
            setError(null);

            await vacationService.processPayment(vacationRequest.id, paymentDate);

            setSuccess(true);

            // Llamar callback y cerrar después de un breve delay
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 1500);

        } catch (err) {
            console.error('Error processing payment:', err);
            setError(err.response?.data?.error || 'Error al procesar el pago');
        } finally {
            setProcessing(false);
        }
    };

    // Formatear período para mostrar
    const period = vacationRequest ? {
        start: vacationRequest.start_date,
        end: vacationRequest.end_date,
    } : null;

    const employeeName = vacationRequest?.employee_name ||
        (vacationRequest?.employee ? `${vacationRequest.employee.first_name} ${vacationRequest.employee.last_name}` : null);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Procesar Pago de Vacaciones"
            description="Revise el desglose antes de confirmar el pago"
            size="lg"
            className="w-full max-w-lg mx-4 sm:mx-auto"
            closeOnOverlayClick={!processing}
            closeOnEscape={!processing}
        >
            <div className="overflow-y-auto max-h-[60vh] px-2 mb-4">

                {/* Date Picker */}
                {!loading && !error && !success && (
                    <div className="mb-6 sticky top-0 bg-white z-10 py-2 border-b border-gray-100">
                        <InputField
                            type="date"
                            label="Fecha de Pago"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            icon={Calendar}
                            required
                        />
                    </div>
                )}
                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 size={40} className="animate-spin text-nominix-electric mb-4" />
                        <p className="text-gray-500 text-sm">Calculando pago...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="p-4 bg-red-50 rounded-full mb-4">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <p className="text-red-600 font-bold mb-2">Error</p>
                        <p className="text-gray-500 text-sm text-center">{error}</p>
                        <Button
                            variant="secondary"
                            onClick={loadSimulation}
                            className="mt-4"
                        >
                            Reintentar
                        </Button>
                    </div>
                )}

                {/* Success State */}
                {success && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="p-4 bg-green-50 rounded-full mb-4 animate-bounce">
                            <CheckCircle2 size={40} className="text-green-500" />
                        </div>
                        <p className="text-green-600 font-bold text-lg">¡Pago Procesado!</p>
                        <p className="text-gray-500 text-sm mt-2">
                            El pago ha sido registrado exitosamente
                        </p>
                    </div>
                )}

                {/* Preview State */}
                {!loading && !error && !success && simulation && (
                    <>
                        <VacationPaymentPreview
                            simulation={simulation}
                            employeeName={employeeName}
                            period={period}
                        />
                    </>
                )}

            </div>{/* End scrollable area */}

            {!loading && !error && !success && simulation && (
                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="electric"
                        onClick={handleProcessPayment}
                        loading={processing}
                        icon={DollarSign}
                    >
                        Procesar Pago
                    </Button>
                </ModalFooter>
            )}
        </Modal >
    );
};

export default VacationPaymentModal;
