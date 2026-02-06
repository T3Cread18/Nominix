import React, { useState } from 'react';
import {
    Calculator, ArrowRight,
    CheckCircle2, Info, TrendingUp, AlertTriangle,
    Calendar, Briefcase, Scale
} from 'lucide-react';
import { useSettlementSimulation } from '../../hooks/useSocialBenefits';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';
import { Skeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';

const SettlementSimulator = ({ employeeId, contractId, hireDate }) => {
    const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);

    const { data: simulation, isLoading, isError, refetch } = useSettlementSimulation(
        contractId,
        terminationDate,
        { enabled: !!contractId }
    );

    const formatCurrency = (val) => {
        if (val === undefined || val === null) return 'Bs. 0,00';
        try {
            return new Intl.NumberFormat('es-VE', {
                style: 'currency',
                currency: 'VES'
            }).format(val);
        } catch (e) {
            return `Bs. ${Number(val).toFixed(2)}`;
        }
    };

    const isMethodAChosen = simulation?.chosen_method === 'GARANTIA';
    const isMethodBChosen = simulation?.chosen_method === 'RETROACTIVO';

    // Calcular años y meses de antigüedad desde years_of_service
    const totalYears = simulation?.years_of_service || 0;
    const years = Math.floor(totalYears);
    const months = Math.round((totalYears - years) * 12);

    return (
        <div className="space-y-8">
            {/* Selector de Fecha y Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Scale size={18} className="text-nominix-electric" />
                        Simulador LOTTT Art. 142
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic">
                        Cálculo comparativo de terminación de relación laboral
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:w-48">
                        <InputField
                            type="date"
                            label="Fecha de Egreso"
                            value={terminationDate}
                            onChange={(e) => setTerminationDate(e.target.value)}
                            size="sm"
                        />
                    </div>
                    <Button
                        variant="dark"
                        size="sm"
                        onClick={() => refetch()}
                        icon={Calculator}
                        loading={isLoading}
                    >
                        Calcular
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-64 rounded-[2rem]" />
                    <Skeleton className="h-64 rounded-[2rem]" />
                </div>
            ) : isError ? (
                <div className="p-12 text-center bg-red-50 rounded-[2rem] border border-red-100">
                    <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                    <h5 className="text-lg font-black text-red-900">Error en el Cálculo</h5>
                    <p className="text-sm text-red-600">No se pudo realizar la simulación. Verifique que el contrato tenga salarios configurados.</p>
                </div>
            ) : simulation ? (
                <div className="space-y-8">
                    {/* COMPARACIÓN VISUAL */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                        {/* Connector Arrow for larger screens */}
                        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full border border-gray-100 items-center justify-center z-10 shadow-sm">
                            <TrendingUp size={20} className="text-gray-300" />
                        </div>

                        {/* MÉTODO A: GARANTÍA */}
                        <div className={cn(
                            "relative p-8 rounded-[3rem] border-2 transition-all duration-500 overflow-hidden",
                            isMethodAChosen
                                ? "border-nominix-electric bg-white shadow-2xl scale-[1.02] z-20"
                                : "border-transparent bg-gray-50/50 opacity-60 grayscale-[0.5]"
                        )}>
                            {isMethodAChosen && (
                                <div className="absolute top-6 right-8">
                                    <Badge variant="primary" icon={CheckCircle2} size="md">Resultante</Badge>
                                </div>
                            )}

                            <div className="mb-6">
                                <div className="w-12 h-12 bg-nominix-smoke rounded-2xl flex items-center justify-center text-slate-900 mb-4">
                                    <Briefcase size={24} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Literal (C)</p>
                                <h5 className="text-xl font-black text-slate-800 italic">Prestación de Garantía</h5>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Saldo Garantía</span>
                                    <span className="text-sm font-black text-slate-800">{formatCurrency(simulation.total_garantia)}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Días Adicionales</span>
                                    <span className="text-sm font-black text-slate-800">{formatCurrency(simulation.total_dias_adicionales)}</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.1em]">Total Neto (A)</span>
                                    <span className="text-lg font-black text-slate-900 italic">{formatCurrency(simulation.net_garantia)}</span>
                                </div>
                            </div>

                            <p className="mt-6 text-[10px] text-gray-400 leading-relaxed italic">
                                * Basado en abonos trimestrales inmutables (15 días c/u) + intereses acumulados.
                            </p>
                        </div>

                        {/* MÉTODO B: RETROACTIVO */}
                        <div className={cn(
                            "relative p-8 rounded-[3rem] border-2 transition-all duration-500 overflow-hidden",
                            isMethodBChosen
                                ? "border-nominix-electric bg-white shadow-2xl scale-[1.02] z-20"
                                : "border-transparent bg-gray-50/50 opacity-60 grayscale-[0.5]"
                        )}>
                            {isMethodBChosen && (
                                <div className="absolute top-6 right-8">
                                    <Badge variant="primary" icon={CheckCircle2} size="md">Resultante</Badge>
                                </div>
                            )}

                            <div className="mb-6">
                                <div className="w-12 h-12 bg-nominix-smoke rounded-2xl flex items-center justify-center text-slate-900 mb-4">
                                    <History size={24} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Literal (D)</p>
                                <h5 className="text-xl font-black text-slate-800 italic">Cálculo Retroactivo</h5>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Días Totales</span>
                                    <span className="text-sm font-black text-slate-800">{simulation.retroactive_days} días</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Salario Integral Final</span>
                                    <span className="text-sm font-black text-slate-800">{formatCurrency(simulation.final_daily_salary)}</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.1em]">Total Neto (B)</span>
                                    <span className="text-lg font-black text-slate-900 italic">{formatCurrency(simulation.retroactive_amount)}</span>
                                </div>
                            </div>

                            <p className="mt-6 text-[10px] text-gray-400 leading-relaxed italic">
                                * Basado en 30 días de salario integral por cada año de servicio o fracción mayor a 6 meses.
                            </p>
                        </div>
                    </div>

                    {/* RESULTADO FINAL */}
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 w-64 h-64 bg-nominix-electric/10 rounded-full blur-[100px]" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="text-center md:text-left">
                                <Badge variant="outline" className="text-nominix-electric border-nominix-electric/30 mb-4">Monto a Liquidar</Badge>
                                <h2 className="text-5xl font-black italic tracking-tighter">
                                    {formatCurrency(simulation.settlement_amount)}
                                </h2>
                                <p className="text-xs font-medium opacity-50 mt-2 flex items-center justify-center md:justify-start gap-2">
                                    <Info size={14} />
                                    Seleccionado por ser el método más favorable para el trabajador.
                                </p>
                            </div>

                            <div className="h-px w-full md:w-px md:h-20 bg-white/10" />

                            <div className="grid grid-cols-2 gap-8 text-center md:text-left">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Antigüedad</p>
                                    <p className="text-xl font-black italic">{years} años, {months} meses</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Días Totales</p>
                                    <p className="text-xl font-black italic">{simulation.retroactive_days} días</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                    <Calculator className="mx-auto text-gray-300 mb-4" size={48} />
                    <h5 className="text-sm font-black text-gray-400 uppercase tracking-widest">Esperando Parámetros</h5>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">Seleccione una fecha de egreso para simular la liquidación.</p>
                </div>
            )}
        </div>
    );
};

export default SettlementSimulator;
