import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, FolderClock, AlertCircle, Loader2 } from 'lucide-react';
import vacationsService from '../../../../services/vacations.service';
import VacationBalanceCard from './VacationBalanceCard';
import Button from '../../../../components/ui/Button';
import VacationRequestModal from './VacationRequestModal';
import VacationAdvanceModal from './VacationAdvanceModal';

const VacationManager = ({ employeeId }) => {
    const queryClient = useQueryClient();
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [advanceBalance, setAdvanceBalance] = useState(null); // Balance selected for advance

    // 1. Fetch Balances
    const { data: balances = [], isLoading, error } = useQuery({
        queryKey: ['vacation-balances', employeeId],
        queryFn: () => vacationsService.getBalances(employeeId),
        enabled: !!employeeId
    });

    // 2. Generation Mutation
    const { mutate: generateMissing, isPending: isGenerating } = useMutation({
        mutationFn: () => vacationsService.generateMissingBalances(employeeId),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['vacation-balances', employeeId]);
            const count = data.length || 0;
            toast.success(`Se generaron ${count} periodos faltantes.`);
        },
        onError: (err) => {
            toast.error("Error al generar saldos: " + err.message);
        }
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-10 text-gray-400">
            <Loader2 className="animate-spin mb-2" />
            <span className="text-sm">Cargando vacaciones...</span>
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
            <AlertCircle size={20} />
            <span>Error cargando vacaciones: {error.message}</span>
        </div>
    );

    const hasBalances = balances.length > 0;
    const totalAvailable = balances.reduce((acc, b) => acc + b.remaining_days, 0);

    return (
        <div className="space-y-6">
            {/* HEADER / ACTIONS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Gestión de Vacaciones</h3>
                    <p className="text-sm text-gray-500">Histórico de disfrute y saldos disponibles.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botón generar faltantes si no hay balances recientes */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateMissing()}
                        loading={isGenerating}
                        icon={FolderClock}
                    >
                        Generar Histórico
                    </Button>

                    {/* Botón para solicitar vacaciones */}
                    <Button
                        variant="dark"
                        size="sm"
                        icon={Plus}
                        disabled={totalAvailable <= 0}
                        title={totalAvailable <= 0 ? "No hay días disponibles" : "Solicitar Vacaciones"}
                        onClick={() => setIsRequestModalOpen(true)}
                    >
                        Solicitar
                    </Button>
                </div>
            </div>

            {/* TOTAL AVAILABLE BANNER */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Total Disponible</span>
                    <div className="text-3xl font-black text-blue-700 leading-none mt-1">
                        {totalAvailable} <span className="text-lg font-bold text-blue-400">Días</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-blue-600 max-w-[200px]">
                        Los días se descuentan automáticamente del periodo más antiguo disponible.
                    </p>
                </div>
            </div>

            {/* BALANCES LIST */}
            {!hasBalances ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <FolderClock className="mx-auto text-gray-300 mb-2" size={40} />
                    <p className="text-gray-500 font-medium">No hay histórico de vacaciones.</p>
                    <p className="text-sm text-gray-400">Genere el histórico para comenzar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {balances.map((balance) => (
                        <VacationBalanceCard
                            key={balance.id}
                            balance={balance}
                            onGenerateAdvance={(b) => setAdvanceBalance(b)}
                        />
                    ))}
                </div>
            )}

            {/* MODALS */}
            <VacationRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                employeeId={employeeId}
            />

            <VacationAdvanceModal
                isOpen={!!advanceBalance}
                onClose={() => setAdvanceBalance(null)}
                balance={advanceBalance}
            />
        </div>
    );
};

export default VacationManager;
