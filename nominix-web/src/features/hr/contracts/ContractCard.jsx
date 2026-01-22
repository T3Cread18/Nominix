import React from 'react';
import { Briefcase, Calendar, DollarSign, Clock, Building2, CheckCircle2, History, Pencil, Percent } from 'lucide-react';
import { cn } from '../../../utils/cn';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

const ContractCard = ({ contract, isActive, onEdit }) => {
    // Formatear fechas
    const formatDate = (dateString) => {
        if (!dateString) return 'Indefinido';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // Formatear moneda
    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(amount);
    };

    // Traducir frecuencia
    const frequencyMap = {
        'WEEKLY': 'Semanal',
        'BIWEEKLY': 'Quincenal',
        'MONTHLY': 'Mensual'
    };

    // Traducir tipo
    const typeMap = {
        'INDEFINITE': 'Tiempo Indeterminado',
        'FIXED_TERM': 'Tiempo Determinado',
        'PROJECT': 'Por Obra'
    };

    return (
        <Card
            className={cn(
                "group relative border transition-all duration-300",
                isActive
                    ? "bg-gradient-to-br from-nominix-dark to-slate-900 text-white shadow-xl shadow-slate-900/20 border-transparent"
                    : "bg-white text-slate-600 hover:border-nominix-electric/30 hover:shadow-lg hover:shadow-nominix-electric/5 border-gray-100"
            )}
            size="md"
            rounded="2xl"
        >
            {/* Etiqueta de Estado */}
            <div className="absolute top-6 right-6">
                {isActive ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm border border-green-500/20">
                        <CheckCircle2 size={12} /> Vigente
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">
                        <History size={12} /> Histórico
                    </span>
                )}
            </div>

            {/* Header: Cargo y Tipo */}
            <div className="mb-6 pr-24">
                <h3 className={cn(
                    "text-xl font-black mb-1 leading-tight",
                    isActive ? "text-white" : "text-slate-800"
                )}>
                    {contract.position || 'Cargo sin definir'}
                </h3>
                <div className="flex items-center gap-2 opacity-80">
                    <Briefcase size={14} />
                    <span className="text-xs font-bold uppercase tracking-wide">
                        {typeMap[contract.contract_type] || contract.contract_type}
                    </span>
                </div>
            </div>

            {/* Grid de Detalles */}
            <div className={cn(
                "grid grid-cols-2 gap-y-4 gap-x-2 text-sm",
                isActive ? "text-slate-300" : "text-gray-500"
            )}>
                {/* Fechas */}
                <div className="col-span-2 flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <Calendar size={18} className={isActive ? "text-nominix-electric" : "text-slate-400"} />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Duración</p>
                        <p className="font-bold">
                            {formatDate(contract.start_date)} <span className="opacity-50 mx-1">→</span> {formatDate(contract.end_date)}
                        </p>
                    </div>
                </div>

                {/* Salario */}
                <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={16} className={isActive ? "text-green-400" : "text-slate-400"} />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Salario Base</span>
                    </div>
                    <p className="text-lg font-black">{formatCurrency(contract.salary_amount, contract.salary_currency)}</p>
                </div>

                {/* Frecuencia */}
                <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={16} className={isActive ? "text-orange-400" : "text-slate-400"} />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Frecuencia</span>
                    </div>
                    <p className="font-bold">{frequencyMap[contract.payment_frequency] || contract.payment_frequency}</p>
                </div>

                {/* ISLR Retention (solo si > 0) */}
                {parseFloat(contract.islr_retention_percentage) > 0 && (
                    <div className="col-span-2 flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Percent size={16} className={isActive ? "text-yellow-400" : "text-slate-400"} />
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Retención ISLR</span>
                        </div>
                        <p className="font-bold">{contract.islr_retention_percentage}%</p>
                    </div>
                )}
            </div>

            {/* Footer: Sede y Dept (Snapshot) */}
            {(contract.branch || contract.department) && (
                <div className={cn(
                    "mt-6 pt-4 border-t flex items-center gap-4 text-xs font-medium",
                    isActive ? "border-white/10 text-slate-400" : "border-gray-100 text-gray-400"
                )}>
                    {contract.department && (
                        <div className="flex items-center gap-1.5">
                            <Building2 size={14} />
                            {typeof contract.department === 'object' ? contract.department.name : contract.department}
                        </div>
                    )}
                </div>
            )}

            {/* Botón Editar */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all">
                <Button
                    onClick={(e) => { e.stopPropagation(); onEdit(contract); }}
                    variant={isActive ? "ghost" : "secondary"}
                    className={isActive ? "text-white hover:bg-white/20" : ""}
                    size="sm"
                    icon={Pencil}
                />
            </div>
        </Card>
    );
};

export default ContractCard;
