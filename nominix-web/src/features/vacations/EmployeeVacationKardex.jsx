import React, { useState, useEffect } from 'react';
import {
    FileText,
    TrendingUp,
    TrendingDown,
    Loader2,
    RefreshCw,
    Calendar,
    User,
    ArrowUpCircle,
    ArrowDownCircle,
    Settings,
} from 'lucide-react';

import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import vacationService from '../../services/vacation.service';
import { cn } from '../../utils/cn';

/**
 * EmployeeVacationKardex - Historial de movimientos de vacaciones de un empleado.
 */
const EmployeeVacationKardex = ({ employeeId, employeeName }) => {
    const [kardexData, setKardexData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!employeeId) {
            setKardexData(null);
            setLoading(false);
            return;
        }

        const fetchKardex = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await vacationService.getEmployeeBalance(employeeId);
                setKardexData(data);
            } catch (err) {
                console.error('Error loading kardex:', err);
                setError('Error al cargar el historial');
            } finally {
                setLoading(false);
            }
        };

        fetchKardex();
    }, [employeeId]);

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'ACCRUAL':
                return <ArrowUpCircle size={16} className="text-green-500" />;
            case 'USAGE':
                return <ArrowDownCircle size={16} className="text-red-500" />;
            case 'ADJUSTMENT':
                return <Settings size={16} className="text-blue-500" />;
            default:
                return <FileText size={16} className="text-gray-500" />;
        }
    };

    const getTransactionBadge = (type) => {
        const config = {
            ACCRUAL: { variant: 'success', label: 'Acumulado' },
            USAGE: { variant: 'error', label: 'Usado' },
            ADJUSTMENT: { variant: 'secondary', label: 'Ajuste' },
        };
        const { variant, label } = config[type] || { variant: 'secondary', label: type };
        return <Badge variant={variant}>{label}</Badge>;
    };

    if (!employeeId) {
        return (
            <Card>
                <CardContent>
                    <div className="text-center py-12 text-gray-400">
                        <User size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Seleccione un empleado</p>
                        <p className="text-xs mt-1">El historial de movimientos aparecerá aquí</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText size={18} />
                            Kardex de Vacaciones
                        </CardTitle>
                        <CardDescription>
                            {employeeName || `Empleado #${employeeId}`}
                        </CardDescription>
                    </div>
                    {kardexData && (
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Saldo Actual
                            </p>
                            <p className={cn(
                                "text-2xl font-black",
                                kardexData.current_balance >= 0 ? "text-green-600" : "text-red-500"
                            )}>
                                {kardexData.current_balance} días
                            </p>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-nominix-electric" size={32} />
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">
                        <p>{error}</p>
                    </div>
                ) : !kardexData?.entries?.length ? (
                    <div className="text-center py-12 text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Sin movimientos</p>
                        <p className="text-xs mt-1">No hay movimientos registrados</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Table Header */}
                        <div className="grid grid-cols-5 gap-4 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <div>Fecha</div>
                            <div>Tipo</div>
                            <div>Año Servicio</div>
                            <div className="text-right">Días</div>
                            <div>Descripción</div>
                        </div>

                        {/* Entries */}
                        {kardexData.entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="grid grid-cols-5 gap-4 px-4 py-3 bg-slate-50 rounded-xl items-center hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar size={14} className="text-gray-400" />
                                    {entry.transaction_date}
                                </div>
                                <div className="flex items-center gap-2">
                                    {getTransactionIcon(entry.transaction_type)}
                                    {getTransactionBadge(entry.transaction_type)}
                                </div>
                                <div className="text-sm font-bold text-gray-600">
                                    Año {entry.period_year}
                                </div>
                                <div className={cn(
                                    "text-right text-lg font-black",
                                    entry.days > 0 ? "text-green-600" : "text-red-500"
                                )}>
                                    {entry.days > 0 ? '+' : ''}{entry.days}
                                </div>
                                <div className="text-xs text-gray-500 truncate" title={entry.description}>
                                    {entry.description}
                                </div>
                            </div>
                        ))}

                        {/* Summary */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                                        <TrendingUp size={16} />
                                        <span className="text-xs font-bold">Total Acumulado</span>
                                    </div>
                                    <p className="text-xl font-black text-green-600">
                                        +{kardexData.entries
                                            .filter(e => e.transaction_type === 'ACCRUAL')
                                            .reduce((sum, e) => sum + e.days, 0)} días
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl">
                                    <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                                        <TrendingDown size={16} />
                                        <span className="text-xs font-bold">Total Usado</span>
                                    </div>
                                    <p className="text-xl font-black text-red-500">
                                        {kardexData.entries
                                            .filter(e => e.transaction_type === 'USAGE')
                                            .reduce((sum, e) => sum + e.days, 0)} días
                                    </p>
                                </div>
                                <div className="p-3 bg-nominix-electric/10 rounded-xl">
                                    <div className="flex items-center justify-center gap-1 text-nominix-electric mb-1">
                                        <FileText size={16} />
                                        <span className="text-xs font-bold">Saldo Final</span>
                                    </div>
                                    <p className="text-xl font-black text-nominix-electric">
                                        {kardexData.current_balance} días
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default EmployeeVacationKardex;
