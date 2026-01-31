import React from 'react';
import { cn } from '../../../../utils/cn';
import { Calendar, Wallet, CheckCircle, Clock, Banknote } from 'lucide-react';
import Button from '../../../../components/ui/Button';

const VacationBalanceCard = ({ balance, onGenerateAdvance }) => {
    // Calcular porcentajes para barra de progreso
    const vacationProgress = Math.min(
        (balance.used_vacation_days / balance.entitled_vacation_days) * 100,
        100
    );

    // Estados
    const isCompleted = balance.remaining_days === 0;
    const isBonusPaid = balance.bonus_paid;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            {/* Indicador Año de Servicio (Watermark) */}
            <div className="absolute -right-4 -top-4 text-[100px] font-black text-gray-50 opacity-50 select-none group-hover:text-blue-50 transition-colors">
                {balance.service_year}
            </div>

            {/* HEADER */}
            <div className="relative z-10 flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">
                            #{balance.service_year}
                        </span>
                        <span>Año de Servicio</span>
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wide">
                        Periodo: {balance.period_start} - {balance.period_end}
                    </p>
                </div>

                {isCompleted ? (
                    <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100 flex items-center gap-1.5">
                        <CheckCircle size={14} /> Completado
                    </span>
                ) : (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-100 flex items-center gap-1.5">
                        <Clock size={14} /> Activo
                    </span>
                )}
            </div>

            {/* METRICS GRID */}
            <div className="relative z-10 grid grid-cols-2 gap-4 mb-4">
                {/* Días de Disfrute */}
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                            <Calendar size={14} /> Disfrute
                        </span>
                        <span className="text-xs font-black text-slate-700">
                            {balance.used_vacation_days} / {balance.entitled_vacation_days}
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500 ease-out",
                                isCompleted ? "bg-green-500" : "bg-blue-500"
                            )}
                            style={{ width: `${vacationProgress}%` }}
                        />
                    </div>
                    <div className="mt-1.5 text-right">
                        <span className={cn(
                            "text-xs font-bold",
                            balance.remaining_days > 0 ? "text-blue-600" : "text-gray-400"
                        )}>
                            {balance.remaining_days} días disponibles
                        </span>
                    </div>
                </div>

                {/* Bono Vacacional */}
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                        <Wallet size={14} /> Bono
                    </span>

                    <div className="flex items-end justify-between mt-2">
                        <div>
                            <div className="text-xl font-black text-slate-700 leading-none">
                                {balance.entitled_bonus_days}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold">DÍAS A PAGAR</span>
                        </div>

                        <div className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase border",
                            isBonusPaid
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                            {isBonusPaid ? 'Pagado' : 'Pendiente'}
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTIONS */}
            {!isCompleted && onGenerateAdvance && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <Button
                        size="xs"
                        variant="ghost"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => onGenerateAdvance(balance)}
                        icon={Banknote}
                    >
                        Generar Pago Anticipado
                    </Button>
                </div>
            )}
        </div>
    );
};

export default VacationBalanceCard;
