import React, { useState } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Calendar, RefreshCw, Calculator, TrendingUp, Minus, DollarSign, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

/**
 * Formato de moneda.
 */
const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount || 0);
};

/**
 * TraceTooltip - Muestra un tooltip con los detalles del cálculo.
 */
const TraceTooltip = ({ trace, convert, viewCurrency }) => {
    if (!trace) return null;

    const [show, setShow] = useState(false);

    // Helper para renderizar valores (strings o objetos {type: 'money'})
    const renderValue = (val) => {
        if (val && typeof val === 'object' && val.type === 'money') {
            // Si trae moneda forzada (ej: VES para deducciones), usarla directa sin convertir
            if (val.currency) {
                return formatCurrency(val.amount, val.currency);
            }
            // Si no, convertir a moneda de vista
            return formatCurrency(convert(val.amount), viewCurrency);
        }
        return val;
    };

    return (
        <div className="relative inline-block ml-2">
            <button
                type="button"
                className="text-gray-400 hover:text-nominix-electric transition-colors focus:outline-none"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onClick={() => setShow(!show)} // Para móvil
            >
                <div className="bg-blue-50 hover:bg-blue-100 p-1 rounded-full transition-colors">
                    <Info size={14} className="text-blue-500" />
                </div>
            </button>

            {show && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-white rounded-lg shadow-xl border-gray-100 text-xs z-50">
                    <div className="font-bold text-gray-700 mb-2 border-b border-gray-100 pb-1">
                        Fórmula: <span className="text-nominix-electric">{trace.formula}</span>
                    </div>
                    <div className="space-y-1">
                        {trace.values && Object.entries(trace.values).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                                <span className="text-gray-500">{key}:</span>
                                <span className="font-medium text-gray-800">{renderValue(value)}</span>
                            </div>
                        ))}
                    </div>
                    {/* Flecha del tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-white transform rotate-45 border-r border-b border-gray-100"></div>
                </div>
            )}
        </div>
    );
};

/**
 * VacationPaymentPreview - Vista previa del cálculo de pago de vacaciones.
 * 
 * Muestra el desglose completo: devengados, deducciones y neto.
 * 
 * @param {object} simulation - Datos de simulación del backend
 * @param {string} employeeName - Nombre del empleado
 * @param {object} period - Período de vacaciones { start, end }
 * @param {string} viewCurrency - Moneda de visualización ('USD' | 'VES')
 */
const VacationPaymentPreview = ({
    simulation,
    employeeName,
    period,
    viewCurrency = 'USD'
}) => {
    if (!simulation) {
        return (
            <div className="text-center py-8 text-gray-400">
                <Calculator size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay datos de simulación</p>
            </div>
        );
    }

    // Determinar tasa y moneda base de la simulación
    const simCurrency = simulation.currency || 'USD';
    const exchangeRate = parseFloat(simulation.exchange_rate || 0);
    const traces = simulation.traces || {};

    /**
     * Convierte un monto a la moneda de visualización.
     */
    const convert = (amount) => {
        const val = parseFloat(amount || 0);

        // Si la moneda es la misma, retornar valor original
        if (simCurrency === viewCurrency) return val;

        // Convertir de USD a VES
        if (simCurrency === 'USD' && viewCurrency === 'VES') {
            return val * exchangeRate;
        }

        // Convertir de VES a USD
        if (simCurrency === 'VES' && viewCurrency === 'USD') {
            return exchangeRate > 0 ? val / exchangeRate : 0;
        }

        return val;
    };

    // Extraer datos y convertir
    const daily_salary = convert(simulation.daily_salary);

    // Devengados
    const vacation_amount = convert(simulation.vacation_amount);
    const rest_amount = convert(simulation.rest_amount);
    const holiday_amount = convert(simulation.holiday_amount);
    const bonus_amount = convert(simulation.bonus_amount);
    const gross_total = convert(simulation.gross_total);

    // Deducciones
    // FIX: NO CONVERTIR. Siempre usar el valor base (que ya viene en VES).
    const ivss_amount = simulation.ivss_amount;
    const faov_amount = simulation.faov_amount;
    const rpe_amount = simulation.rpe_amount;
    const total_deductions = simulation.total_deductions;

    // Neto
    const net_total = convert(simulation.net_total);

    const {
        vacation_days = 0,
        rest_days = 0,
        holiday_days = 0,
        bonus_days = 0,
    } = simulation;

    // Filas de devengados
    const accruals = [
        { label: 'Días de Vacaciones', days: vacation_days, amount: vacation_amount, color: 'bg-blue-50 text-blue-700', trace: traces.vacation_amount },
        { label: 'Días de Descanso (Sáb/Dom)', days: rest_days, amount: rest_amount, color: 'bg-gray-50 text-gray-600', trace: traces.rest_amount },
        { label: 'Días Feriados', days: holiday_days, amount: holiday_amount, color: 'bg-amber-50 text-amber-700', trace: traces.holiday_amount },
        { label: 'Bono Vacacional', days: bonus_days, amount: bonus_amount, color: 'bg-purple-50 text-purple-700', trace: traces.bonus_amount },
    ];

    // Filas de deducciones
    // FIX: Las deducciones de ley SIEMPRE se muestran en VES (Bolívares), por norma legal y petición del usuario.
    const deductions = [
        { label: 'IVSS (4%)', amount: ivss_amount, trace: traces.ivss_amount, currency: 'VES' },
        { label: 'FAOV (1%)', amount: faov_amount, trace: traces.faov_amount, currency: 'VES' },
        { label: 'RPE (0.5%)', amount: rpe_amount, trace: traces.rpe_amount, currency: 'VES' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            {employeeName && (
                <div className="text-center pb-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-nominix-dark">{employeeName}</h3>
                    {period && (
                        <p className="text-sm text-gray-500">
                            {period.start} — {period.end}
                        </p>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                            Salario Diario: {formatCurrency(daily_salary, viewCurrency)}
                            <TraceTooltip trace={traces.daily_salary} convert={convert} viewCurrency={viewCurrency} />
                        </Badge>
                        {viewCurrency === 'VES' && exchangeRate > 0 && (
                            <Badge variant="outline" className="opacity-75">
                                Tasa: {exchangeRate} Bs/$
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* Tabla de Devengados */}
            <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Devengados
                </h4>
                <div className="space-y-2">
                    {accruals.map((item, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl gap-1 sm:gap-2",
                                item.color
                            )}
                        >
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{item.label}</span>
                                <Badge variant="outline" size="sm">
                                    {item.days} días
                                </Badge>
                                <TraceTooltip trace={item.trace} convert={convert} viewCurrency={viewCurrency} />
                            </div>
                            <span className="font-bold text-right">
                                {formatCurrency(item.amount, viewCurrency)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total Bruto */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-nominix-dark rounded-xl text-white gap-2">
                <div className="flex items-center gap-2">
                    <TrendingUp size={18} />
                    <span className="font-bold text-sm sm:text-base">TOTAL BRUTO</span>
                </div>
                <span className="text-lg sm:text-xl font-black">
                    {formatCurrency(gross_total, viewCurrency)}
                </span>
            </div>

            {/* Deducciones */}
            <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Deducciones
                </h4>
                <div className="space-y-2">
                    {deductions.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-red-50 rounded-xl"
                        >
                            <div className="flex items-center gap-2">
                                <Minus size={14} className="text-red-500" />
                                <span className="text-sm text-red-700">{item.label}</span>
                                <TraceTooltip trace={item.trace} convert={convert} viewCurrency={viewCurrency} />
                            </div>
                            <span className="font-bold text-red-600">
                                -{formatCurrency(item.amount, 'VES')}
                            </span>
                        </div>
                    ))}

                    {/* Total Deducciones */}
                    <div className="flex items-center justify-between p-3 border-t border-red-200 pt-4">
                        <span className="text-sm font-bold text-red-700">Total Deducciones</span>
                        <span className="font-bold text-red-600">
                            -{formatCurrency(total_deductions, 'VES')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Total Neto */}
            <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={18} />
                    <span className="font-bold text-sm uppercase opacity-90">
                        Neto a Cobrar ({viewCurrency})
                    </span>
                </div>
                <span className="text-3xl font-black">
                    {formatCurrency(net_total, viewCurrency)}
                </span>

                {simCurrency !== viewCurrency && (
                    <p className="text-xs opacity-75 mt-2">
                        * Monto estimado según tasa {exchangeRate}
                    </p>
                )}
            </div>

            {/* Indicador de base salarial */}
            {simulation.vacation_salary_basis_display && (
                <p className="text-[10px] text-gray-400 text-center mt-2">
                    Base de cálculo: {simulation.vacation_salary_basis_display}
                </p>
            )}
        </div>
    );
};

export default VacationPaymentPreview;
