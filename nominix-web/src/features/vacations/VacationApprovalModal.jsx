import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import VacationPaymentPreview from './VacationPaymentPreview';
import vacationService from '../../services/vacation.service';
import { cn } from '../../utils/cn';

/**
 * VacationApprovalModal - Modal para aprobar solicitud con previsualización.
 * 
 * Flujo:
 * 1. Al abrir, carga simulación completa desde el backend
 * 2. Muestra vista previa con VacationPaymentPreview
 * 3. Usuario puede cancelar o confirmar la aprobación
 * 
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Callback al cerrar
 * @param {object} vacationRequest - Solicitud de vacaciones a aprobar
 * @param {function} onApprove - Callback al confirmar aprobación
 */
const VacationApprovalModal = ({
    isOpen,
    onClose,
    vacationRequest,
    onApprove,
}) => {
    const [simulation, setSimulation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [approving, setApproving] = useState(false);
    const [viewCurrency, setViewCurrency] = useState('USD');

    // Memoizar loadSimulation para evitar problemas de dependencias
    const loadSimulation = useCallback(async () => {
        if (!vacationRequest?.id) return;

        try {
            setLoading(true);
            setError(null);
            // Usamos simulateCompletePayment para tener el desglose completo
            const data = await vacationService.simulateCompletePayment(vacationRequest.id);
            setSimulation(data);
        } catch (err) {
            console.error('Error loading simulation:', err);
            setError(err.response?.data?.error || 'Error al cargar la simulación');
        } finally {
            setLoading(false);
        }
    }, [vacationRequest?.id]);

    // Cargar simulación al abrir
    useEffect(() => {
        if (isOpen && vacationRequest?.id) {
            loadSimulation();
            setViewCurrency('USD');
        } else {
            setSimulation(null);
            setError(null);
        }
    }, [isOpen, vacationRequest?.id, loadSimulation]);

    const handleApprove = async () => {
        try {
            setApproving(true);
            await onApprove(vacationRequest.id);
            onClose();
        } catch (error) {
            // El error se maneja en el componente padre, pero reseteamos estado aquí
            console.error(error);
        } finally {
            setApproving(false);
        }
    };

    // Formatear período para mostrar
    const period = vacationRequest ? {
        start: vacationRequest.start_date,
        end: vacationRequest.end_date,
    } : null;

    const employeeName = vacationRequest?.employee_name ||
        (vacationRequest?.employee ? `${vacationRequest.employee.first_name} ${vacationRequest.employee.last_name} ` : null);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Aprobar Solicitud de Vacaciones"
            description="Revise el cálculo estimado antes de aprobar la solicitud"
            size="lg"
            className="w-full max-w-lg mx-4 sm:mx-auto"
            closeOnOverlayClick={!approving}
            closeOnEscape={!approving}
        >
            <div className="overflow-y-auto max-h-[60vh] px-2 mb-4">

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 size={40} className="animate-spin text-nominix-electric mb-4" />
                        <p className="text-gray-500 text-sm">Calculando simulación...</p>
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

                {/* Preview State */}
                {!loading && !error && simulation && (
                    <div className="space-y-4">
                        {/* Currency Toggle */}
                        <div className="flex justify-end">
                            <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                                        viewCurrency === 'USD'
                                            ? "bg-white text-nominix-dark shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                    onClick={() => setViewCurrency('USD')}
                                >
                                    USD ($)
                                </button>
                                <button
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                                        viewCurrency === 'VES'
                                            ? "bg-white text-nominix-dark shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                    onClick={() => setViewCurrency('VES')}
                                >
                                    VES (Bs.)
                                </button>
                            </div>
                        </div>

                        <VacationPaymentPreview
                            simulation={simulation}
                            employeeName={employeeName}
                            period={period}
                            viewCurrency={viewCurrency}
                        />
                    </div>
                )}

            </div>

            {!loading && !error && simulation && (
                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={approving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleApprove}
                        loading={approving}
                        icon={CheckCircle2}
                    >
                        Aprobar Solicitud
                    </Button>
                </ModalFooter>
            )}
        </Modal>
    );
};

export default VacationApprovalModal;
