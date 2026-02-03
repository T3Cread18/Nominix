import React from 'react';
import { DollarSign, Minus, Calculator, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

/**
 * Formato de moneda para Venezuela.
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount || 0);
};

/**
 * VacationPaymentPreview - Vista previa del cálculo de pago de vacaciones.
 * 
 * Muestra el desglose completo: devengados, deducciones y neto.
 * 
 * @param {object} simulation - Datos de simulación del backend
 * @param {string} employeeName - Nombre del empleado
 * @param {object} period - Período de vacaciones { start, end }
 */
const VacationPaymentPreview = ({
    simulation,
    employeeName,
    period,
}) => {
    if (!simulation) {
        return (
            <div className="text-center py-8 text-gray-400">
                <Calculator size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay datos de simulación</p>
            </div>
        );
    }

    // Extraer datos con valores por defecto para compatibilidad
    const {
        daily_salary = 0,
        vacation_days = 0,
        rest_days = 0,
        holiday_days = 0,
        bonus_days = 0,
        vacation_amount = 0,
        rest_amount = 0,
        holiday_amount = 0,
        bonus_amount = 0,
        gross_total = 0,
        ivss_amount = 0,
        faov_amount = 0,
        rpe_amount = 0,
        total_deductions = 0,
        net_total = 0,
    } = simulation;

    // Filas de devengados
    const accruals = [
        { label: 'Días de Vacaciones', days: vacation_days, amount: vacation_amount, color: 'bg-blue-50 text-blue-700' },
        { label: 'Días de Descanso (Sáb/Dom)', days: rest_days, amount: rest_amount, color: 'bg-gray-50 text-gray-600' },
        { label: 'Días Feriados', days: holiday_days, amount: holiday_amount, color: 'bg-amber-50 text-amber-700' },
        { label: 'Bono Vacacional', days: bonus_days, amount: bonus_amount, color: 'bg-purple-50 text-purple-700' },
    ];

    // Filas de deducciones
    const deductions = [
        { label: 'IVSS (4%)', amount: ivss_amount },
        { label: 'FAOV (1%)', amount: faov_amount },
        { label: 'RPE (0.5%)', amount: rpe_amount },
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
                    <Badge variant="secondary" className="mt-2">
                        Salario Diario: {formatCurrency(daily_salary)}
                    </Badge>
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
                            </div>
                            <span className="font-bold text-right">
                                {formatCurrency(item.amount)}
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
                    {formatCurrency(gross_total)}
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
                            </div>
                            <span className="font-bold text-red-600">
                                -{formatCurrency(item.amount)}
                            </span>
                        </div>
                    ))}

                    {/* Total Deducciones */}
                    <div className="flex items-center justify-between p-3 border-t border-red-200 pt-4">
                        <span className="text-sm font-bold text-red-700">Total Deducciones</span>
                        <span className="font-bold text-red-600">
                            -{formatCurrency(total_deductions)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Total Neto - Dual Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* USD */}
                <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="font-bold text-xs sm:text-sm uppercase opacity-80">Neto USD</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black">
                        {formatCurrency(net_total)}
                    </span>
                </div>

                {/* VES */}
                <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs sm:text-sm uppercase opacity-80">Neto Bs.</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black">
                        {simulation.net_total_ves
                            ? `Bs. ${simulation.net_total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                            : 'N/A'
                        }
                    </span>
                    {simulation.exchange_rate && (
                        <span className="text-[10px] sm:text-xs opacity-70 mt-1">
                            Tasa: {simulation.exchange_rate} Bs/$
                        </span>
                    )}
                </div>
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
