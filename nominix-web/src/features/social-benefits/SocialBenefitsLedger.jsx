import React from 'react';
import {
    ArrowUpRight, ArrowDownLeft, Calendar,
    Info, History, Calculator, UserCheck, Shield
} from 'lucide-react';
import { useSocialBenefitsLedger } from '../../hooks/useSocialBenefits';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { Skeleton } from '../../components/ui/Skeleton';

const SocialBenefitsLedger = ({ employeeId, contractId }) => {
    const { data: ledger = [], isLoading } = useSocialBenefitsLedger({
        employee: employeeId,
        contract: contractId
    });

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'VES',
            minimumFractionDigits: 2
        }).format(val);
    };

    const getTransactionTypeConfig = (type) => {
        const configs = {
            'GARANTIA': { label: 'Garantía', icon: Shield, variant: 'primary' },
            'DIAS_ADIC': { label: 'Días Adic.', icon: UserCheck, variant: 'success' },
            'INTERES': { label: 'Intereses', icon: ArrowUpRight, variant: 'info' },
            'ANTICIPO': { label: 'Anticipo', icon: ArrowDownLeft, variant: 'warning' },
            'LIQUIDACION': { label: 'Liquidación', icon: Calculator, variant: 'danger' },
            'REVERSAL': { label: 'Reverso', icon: History, variant: 'default' },
        };
        return configs[type] || { label: type, icon: Info, variant: 'default' };
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Resumen Superior */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-nominix-dark text-white p-6 rounded-[2rem] shadow-xl overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Saldo Acumulado</p>
                    <h3 className="text-2xl font-black italic">
                        {ledger.length > 0 ? formatCurrency(ledger[0].balance) : formatCurrency(0)}
                    </h3>
                    <div className="mt-4 flex items-center gap-2">
                        <Badge variant="primary" size="xs">LOTT Art. 142</Badge>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Último Movimiento</p>
                    <div className="flex items-center gap-3">
                        {ledger.length > 0 ? (
                            <>
                                <div className="p-2 bg-gray-50 rounded-xl text-nominix-dark">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-800">{new Date(ledger[0].transaction_date).toLocaleDateString()}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{ledger[0].transaction_type_display}</p>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Sin movimientos registrados</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla del Ledger */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        <History size={16} className="text-nominix-electric" />
                        Historial de Movimientos
                    </h4>
                    <span className="text-[10px] font-bold text-gray-400 italic">Libro Auxiliar Inmutable</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50 bg-gray-50/30">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha / Referencia</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Concepto</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Base / Salario</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Monto</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {ledger.map((entry) => {
                                const config = getTransactionTypeConfig(entry.transaction_type);
                                return (
                                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-black text-slate-800">{new Date(entry.transaction_date).toLocaleDateString()}</p>
                                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter truncate max-w-[150px]">
                                                {entry.period_description}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-xl border transition-all duration-300",
                                                    entry.amount > 0 ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-500 border-red-100"
                                                )}>
                                                    <config.icon size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{config.label}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Auditoría: {entry.created_by}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {entry.basis_days > 0 ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-700">{entry.basis_days} días</span>
                                                    <span className="text-[9px] font-medium text-gray-400">S.I: {formatCurrency(entry.daily_salary_used)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-gray-300 italic">No aplica</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={cn(
                                                "text-xs font-black italic",
                                                entry.amount > 0 ? "text-green-600" : "text-red-500"
                                            )}>
                                                {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black text-slate-800 italic">{formatCurrency(entry.balance)}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {ledger.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-8 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <History size={32} />
                                            <p className="text-sm font-bold">No hay movimientos registrados</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tooltip de Auditoría Inferior */}
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Shield size={16} className="text-blue-500 mt-0.5" />
                <p className="text-[10px] font-medium text-blue-700 leading-relaxed">
                    Los registros de este libro auxiliar son **inmutables**. De acuerdo con la estrategia de auditoría total de NÓMINIX,
                    cada entrada guarda un snapshot del salario integral (`basis_salary`) y los días calculados en el momento de la transacción.
                    Cualquier corrección debe realizarse mediante una transacción de **Reverso**.
                </p>
            </div>
        </div>
    );
};

export default SocialBenefitsLedger;
