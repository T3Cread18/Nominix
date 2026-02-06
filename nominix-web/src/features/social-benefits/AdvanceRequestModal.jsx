import React, { useState, useEffect } from 'react';
import {
    Building2, Wallet, AlertCircle,
    Send, X, DollarSign, Calculator
} from 'lucide-react';
import {
    useSocialBenefitsBalance,
    useRequestAdvanceMutation
} from '../../hooks/useSocialBenefits';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

const AdvanceRequestModal = ({ isOpen, onClose, employeeId, contractId }) => {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');

    const { data: balanceData, isLoading: loadingBalance } = useSocialBenefitsBalance(employeeId, {
        enabled: isOpen && !!employeeId
    });

    const { mutate: requestAdvance, isPending } = useRequestAdvanceMutation({
        onSuccess: () => {
            onClose();
            setAmount('');
            setNotes('');
        }
    });

    const currentBalance = balanceData?.balance || 0;
    const maxAllowed = currentBalance * 0.75;
    const isOverLimit = Number(amount) > maxAllowed;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isOverLimit || !amount || Number(amount) <= 0) return;

        requestAdvance({
            contract_id: contractId,
            amount: Number(amount),
            notes: notes
        });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'VES'
        }).format(val);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Solicitar Anticipo de Prestaciones"
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Info Box */}
                <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Disponible Acumulado</p>
                            <h4 className="text-xl font-black italic">{formatCurrency(currentBalance)}</h4>
                        </div>
                        <Badge variant="primary">LOTT Art. 144</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                            <p className="text-[9px] font-bold uppercase opacity-50 mb-1">Tope Máximo (75%)</p>
                            <p className="text-sm font-black text-nominix-electric">{formatCurrency(maxAllowed)}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                            <p className="text-[9px] font-bold uppercase opacity-50 mb-1">Motivo Legal</p>
                            <p className="text-[9px] font-medium leading-tight">Vivienda, Educación, Salud o Pensiones.</p>
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div className="relative">
                        <InputField
                            label="Monto a Solicitar"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            icon={DollarSign}
                            error={isOverLimit ? `El monto excede el límite permitido (${formatCurrency(maxAllowed)})` : null}
                            helperText="Monto en Bolívares (VES)"
                            required
                        />
                    </div>

                    <InputField
                        label="Notas / Justificación"
                        textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Indique el motivo del anticipo..."
                        rows={3}
                    />
                </div>

                {/* Warning if over limit */}
                {isOverLimit && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                        <AlertCircle className="text-red-500 shrink-0 mt-1" size={18} />
                        <p className="text-[11px] font-bold text-red-700 leading-snug">
                            RESTRICTED: El monto solicitado excede el 75% permitido por ley para anticipos.
                            Por favor ajuste el monto para continuar.
                        </p>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="dark"
                        className="flex-1"
                        loading={isPending}
                        disabled={isOverLimit || !amount || Number(amount) <= 0}
                        icon={Send}
                    >
                        Enviar Solicitud
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AdvanceRequestModal;
