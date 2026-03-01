import React, { useState, useEffect, useCallback } from 'react';
import {
    Sun,
    Calendar,
    DollarSign,
    FileSpreadsheet,
    Upload,
    User,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    ArrowRight,
    FileText,
    Briefcase,
    CalendarDays,
    Info,
    XCircle,
} from 'lucide-react';

// UI Components
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

// Feature Components
import EmployeeSelector from '../payroll/EmployeeSelector';
import VacationRequestsList from './VacationRequestsList';
import EmployeeVacationKardex from './EmployeeVacationKardex';

// Services
import vacationService from '../../services/vacation.service';
import axiosClient from '../../api/axiosClient';

// Utils
import {
    calculateReturnDate,
    calculateEndDate,
    isBusinessDay,
    getNonBusinessDayType,
    formatDate,
    formatDateLong,
    calculateYearsOfService,
    formatCurrency,
} from '../../utils/vacationUtils';

import { cn } from '../../utils/cn';
import RequirePermission from '../../context/RequirePermission'; // Imported RequirePermission

/**
 * VacationManager - Componente principal para gestión de vacaciones.
 * 
 * Tabs:
 * - Solicitud Individual: Crear solicitudes de vacaciones
 * - Carga Masiva: Subir Excel con múltiples solicitudes
 */
const VacationManager = () => {
    // ============ STATE ============

    // Employees
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Employee Balance & Summary
    const [employeeSummary, setEmployeeSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Holidays
    const [holidays, setHolidays] = useState([]);
    const [loadingHolidays, setLoadingHolidays] = useState(true);

    // Vacation Request Form
    const [startDate, setStartDate] = useState('');
    const [daysToEnjoy, setDaysToEnjoy] = useState('');
    const [calculatedReturnDate, setCalculatedReturnDate] = useState(null);
    const [calculatedEndDate, setCalculatedEndDate] = useState(null);
    const [startDateWarning, setStartDateWarning] = useState(null);
    const [notes, setNotes] = useState('');

    // Simulation
    const [simulation, setSimulation] = useState(null);
    const [loadingSimulation, setLoadingSimulation] = useState(false);

    // Request Submission
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Bulk Upload
    const [bulkFile, setBulkFile] = useState(null);
    const [uploadingBulk, setUploadingBulk] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);

    // Accrual (Acumulación manual)
    const [accruing, setAccruing] = useState(false);
    const [accrualMessage, setAccrualMessage] = useState(null);

    // ============ DATA LOADING ============

    // Cargar empleados
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoadingEmployees(true);
                const response = await axiosClient.get('/employees/');
                setEmployees(response.data.results || response.data);
            } catch (error) {
                console.error('Error loading employees:', error);
            } finally {
                setLoadingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    // Cargar feriados
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                setLoadingHolidays(true);
                const holidayData = await vacationService.getHolidays(new Date().getFullYear());
                // Convertir a array de fechas
                const holidayDates = holidayData.map(h => h.date || h);
                setHolidays(holidayDates);
            } catch (error) {
                console.error('Error loading holidays:', error);
                setHolidays([]);
            } finally {
                setLoadingHolidays(false);
            }
        };
        fetchHolidays();
    }, []);

    // ============ EMPLOYEE SELECTION ============

    const handleEmployeeSelect = useCallback(async (employee) => {
        setSelectedEmployee(employee);
        setSimulation(null);
        setSubmitSuccess(false);
        setSubmitError(null);

        if (!employee) {
            setEmployeeSummary(null);
            return;
        }

        // Cargar resumen vacacional
        try {
            setLoadingSummary(true);
            const summary = await vacationService.getEmployeeSummary(employee.id);
            setEmployeeSummary(summary);
        } catch (error) {
            console.error('Error loading employee summary:', error);
            setEmployeeSummary(null);
        } finally {
            setLoadingSummary(false);
        }
    }, []);

    // ============ DATE CALCULATIONS ============

    useEffect(() => {
        if (startDate && daysToEnjoy && Number(daysToEnjoy) > 0) {
            const days = Number(daysToEnjoy);
            const endDate = calculateEndDate(startDate, days, holidays);
            const returnDate = calculateReturnDate(startDate, days, holidays);

            setCalculatedEndDate(endDate);
            setCalculatedReturnDate(returnDate);

            // Validar si la fecha de inicio es día hábil
            const dayType = getNonBusinessDayType(startDate, holidays);
            if (dayType) {
                setStartDateWarning(`La fecha seleccionada es ${dayType}`);
            } else {
                setStartDateWarning(null);
            }
        } else {
            setCalculatedEndDate(null);
            setCalculatedReturnDate(null);
            setStartDateWarning(null);
        }
    }, [startDate, daysToEnjoy, holidays]);

    // ============ SIMULATION ============

    const handleSimulate = async () => {
        if (!selectedEmployee || !startDate || !daysToEnjoy) {
            return;
        }

        try {
            setLoadingSimulation(true);

            // Primero crear una solicitud temporal para simular
            const tempRequest = await vacationService.createRequest({
                employee: selectedEmployee.id,
                start_date: startDate,
                end_date: formatDate(calculatedEndDate, 'yyyy-MM-dd'),
                days_requested: Number(daysToEnjoy),
                notes: 'Simulación temporal',
            });

            // Simular cálculo
            const result = await vacationService.simulate(tempRequest.id, Number(daysToEnjoy));
            setSimulation(result);

            // Eliminar la solicitud temporal
            await vacationService.deleteRequest(tempRequest.id);
        } catch (error) {
            console.error('Error simulating:', error);

            // Fallback: mostrar simulación estimada
            if (employeeSummary?.daily_salary) {
                const days = Number(daysToEnjoy);
                const dailySalary = employeeSummary.daily_salary;
                setSimulation({
                    daily_salary: dailySalary,
                    vacation_days: days,
                    salary_amount: dailySalary * days,
                    bonus_days: employeeSummary.bonus_days || Math.min(15, days),
                    bonus_amount: dailySalary * (employeeSummary.bonus_days || Math.min(15, days)),
                    total: dailySalary * days + dailySalary * (employeeSummary.bonus_days || Math.min(15, days)),
                    is_estimate: true,
                });
            }
        } finally {
            setLoadingSimulation(false);
        }
    };

    // ============ SUBMIT REQUEST ============

    const handleSubmitRequest = async () => {
        if (!selectedEmployee || !startDate || !daysToEnjoy || !calculatedEndDate) {
            setSubmitError('Complete todos los campos requeridos');
            return;
        }

        try {
            setSubmitting(true);
            setSubmitError(null);

            await vacationService.createRequest({
                employee: selectedEmployee.id,
                start_date: startDate,
                end_date: formatDate(calculatedEndDate, 'yyyy-MM-dd'),
                days_requested: Number(daysToEnjoy),
                notes: notes || undefined,
            });

            setSubmitSuccess(true);

            // Reset form
            setStartDate('');
            setDaysToEnjoy('');
            setNotes('');
            setSimulation(null);

            // Recargar resumen
            if (selectedEmployee) {
                handleEmployeeSelect(selectedEmployee);
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            setSubmitError(error.response?.data?.error || 'Error al crear la solicitud');
        } finally {
            setSubmitting(false);
        }
    };

    // ============ BULK UPLOAD ============

    const handleBulkUpload = async () => {
        if (!bulkFile) return;

        try {
            setUploadingBulk(true);
            setBulkResult(null);

            const result = await vacationService.uploadBulk(bulkFile);
            setBulkResult(result);
            setBulkFile(null);
        } catch (error) {
            console.error('Error uploading bulk:', error);
            setBulkResult({
                error: error.response?.data?.error || 'Error al procesar el archivo',
                processed: 0,
                errors: error.response?.data?.errors || [],
            });
        } finally {
            setUploadingBulk(false);
        }
    };

    // ============ ACCRUE VACATION DAYS ============

    const handleAccrueVacationDays = async () => {
        if (!selectedEmployee) return;

        try {
            setAccruing(true);
            setAccrualMessage(null);

            const result = await vacationService.accrueVacationDays(selectedEmployee.id);

            setAccrualMessage({
                type: 'success',
                text: result.message || `Días acumulados exitosamente. Nuevo saldo: ${result.new_balance}`,
            });

            // Recargar resumen del empleado
            const summary = await vacationService.getEmployeeSummary(selectedEmployee.id);
            setEmployeeSummary(summary);
        } catch (error) {
            console.error('Error accruing vacation days:', error);
            setAccrualMessage({
                type: 'error',
                text: error.response?.data?.error || 'Error al acumular días',
            });
        } finally {
            setAccruing(false);
        }
    };

    // ============ RENDER ============

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                    <Sun className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-nominix-dark tracking-tight">
                        Gestión de Vacaciones
                    </h1>
                    <p className="text-sm text-gray-500">
                        Solicitudes individuales y carga masiva
                    </p>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="individual">
                <TabsList>
                    <RequirePermission permission="vacations.view_vacationrequest">
                        <TabsTrigger value="requests" icon={FileText}>
                            Solicitudes
                        </TabsTrigger>
                    </RequirePermission>
                    <RequirePermission permission="vacations.add_vacationrequest">
                        <TabsTrigger value="individual" icon={User}>
                            Nueva Solicitud
                        </TabsTrigger>
                    </RequirePermission>
                    <RequirePermission permission="vacations.view_vacationbalance">
                        <TabsTrigger value="kardex" icon={Calendar}>
                            Historial / Kardex
                        </TabsTrigger>
                    </RequirePermission>
                    <RequirePermission permission="vacations.add_vacationrequest">
                        <TabsTrigger value="bulk" icon={FileSpreadsheet}>
                            Carga Masiva
                        </TabsTrigger>
                    </RequirePermission>
                </TabsList>

                {/* ============ TAB: LISTADO DE SOLICITUDES ============ */}
                <RequirePermission permission="vacations.view_vacationrequest">
                    <TabsContent value="requests">
                        <VacationRequestsList />
                    </TabsContent>
                </RequirePermission>

                {/* ============ TAB A: SOLICITUD INDIVIDUAL ============ */}
                <RequirePermission permission="vacations.add_vacationrequest">
                    <TabsContent value="individual">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Column 1: Employee Selection & Balance */}
                            <div className="space-y-6">
                                {/* Employee Selector */}
                                <EmployeeSelector
                                    employees={employees}
                                    onSelect={handleEmployeeSelect}
                                    isLoading={loadingEmployees}
                                />

                                {/* Employee Balance Card */}
                                {selectedEmployee && (
                                    <Card variant="gradient" className="animate-in fade-in slide-in-from-bottom-2">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Briefcase size={16} />
                                                Saldo Vacacional
                                            </CardTitle>
                                            <CardDescription>
                                                {selectedEmployee.first_name} {selectedEmployee.last_name}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {loadingSummary ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 className="animate-spin text-nominix-electric" size={24} />
                                                </div>
                                            ) : employeeSummary ? (
                                                <div className="space-y-4">
                                                    {/* Years of Service */}
                                                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Clock size={16} />
                                                            <span className="text-xs font-bold">Antigüedad</span>
                                                        </div>
                                                        <span className="text-lg font-black text-nominix-dark">
                                                            {employeeSummary.years_of_service || 0} años
                                                        </span>
                                                    </div>

                                                    {/* Days Available */}
                                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <CalendarDays size={16} />
                                                            <span className="text-xs font-bold">Días Disponibles</span>
                                                        </div>
                                                        <span className="text-2xl font-black text-green-600">
                                                            {employeeSummary.available_days || employeeSummary.balance || employeeSummary.entitled_days || 0}
                                                        </span>
                                                    </div>

                                                    {/* Pending Requests */}
                                                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                        <div className="flex items-center gap-2 text-amber-600">
                                                            <FileText size={16} />
                                                            <span className="text-xs font-bold">Solicitudes Pendientes</span>
                                                        </div>
                                                        <span className="text-lg font-black text-amber-600">
                                                            {employeeSummary.pending_requests || 0}
                                                        </span>
                                                    </div>

                                                    {/* Days Entitled */}
                                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                        <span className="text-xs text-gray-500">
                                                            Días que le corresponden por ley
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-700">
                                                            {employeeSummary.entitled_days || 15} días
                                                        </span>
                                                    </div>

                                                    {/* Accrue Button - Show when balance is 0 */}
                                                    {(!employeeSummary.available_days && !employeeSummary.balance) && (
                                                        <div className="pt-2 border-t border-gray-100">
                                                            {accrualMessage && (
                                                                <div className={cn(
                                                                    "mb-2 p-2 rounded-lg text-xs font-bold flex items-center gap-1",
                                                                    accrualMessage.type === 'success'
                                                                        ? "bg-green-50 text-green-600"
                                                                        : "bg-red-50 text-red-500"
                                                                )}>
                                                                    {accrualMessage.type === 'success'
                                                                        ? <CheckCircle2 size={12} />
                                                                        : <XCircle size={12} />
                                                                    }
                                                                    {accrualMessage.text}
                                                                </div>
                                                            )}
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                fullWidth
                                                                onClick={handleAccrueVacationDays}
                                                                loading={accruing}
                                                                icon={RefreshCw}
                                                            >
                                                                Acumular Todos los Años
                                                            </Button>
                                                            <p className="text-[9px] text-gray-400 mt-1 text-center">
                                                                Registra los {employeeSummary.years_of_service || 0} años en el kardex
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-gray-400">
                                                    <Info size={24} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">No se pudo cargar el saldo</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Column 2: Request Form */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar size={18} />
                                            Nueva Solicitud
                                        </CardTitle>
                                        <CardDescription>
                                            Complete los datos para crear una solicitud de vacaciones
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {!selectedEmployee ? (
                                            <div className="text-center py-12 text-gray-400">
                                                <User size={48} className="mx-auto mb-4 opacity-20" />
                                                <p className="font-bold">Seleccione un empleado</p>
                                                <p className="text-xs mt-1">Use el buscador de la izquierda</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Date Inputs Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Start Date */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                            Fecha de Inicio
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={startDate}
                                                            onChange={(e) => setStartDate(e.target.value)}
                                                            className={cn(
                                                                "w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-nominix-electric/20 focus:border-nominix-electric transition-all",
                                                                startDateWarning ? "border-amber-300 bg-amber-50" : "border-gray-100"
                                                            )}
                                                        />
                                                        {startDateWarning && (
                                                            <div className="flex items-center gap-1 mt-2 text-amber-600 text-xs font-bold">
                                                                <AlertTriangle size={12} />
                                                                {startDateWarning}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Days to Enjoy */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                            Días a Disfrutar
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={employeeSummary?.available_days || 30}
                                                            value={daysToEnjoy}
                                                            onChange={(e) => setDaysToEnjoy(e.target.value)}
                                                            placeholder="Ej: 15"
                                                            className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-nominix-electric/20 focus:border-nominix-electric transition-all"
                                                        />
                                                        {(employeeSummary?.available_days || employeeSummary?.entitled_days) && Number(daysToEnjoy) > (employeeSummary.available_days || employeeSummary.entitled_days) && (
                                                            <div className="flex items-center gap-1 mt-2 text-red-500 text-xs font-bold">
                                                                <XCircle size={12} />
                                                                Excede los días disponibles
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Calculated Dates Display */}
                                                {calculatedReturnDate && (
                                                    <div className="bg-gradient-to-r from-nominix-electric/5 to-blue-50 p-4 rounded-2xl border border-nominix-electric/10 animate-in fade-in">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                                    Último día de vacaciones
                                                                </p>
                                                                <p className="text-sm font-black text-nominix-dark">
                                                                    {formatDateLong(calculatedEndDate)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <ArrowRight size={20} className="text-nominix-electric" />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                                        Fecha de Retorno
                                                                    </p>
                                                                    <p className="text-sm font-black text-green-600">
                                                                        {formatDateLong(calculatedReturnDate)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                        Observaciones (Opcional)
                                                    </label>
                                                    <textarea
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                        rows={2}
                                                        placeholder="Alguna nota adicional..."
                                                        className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nominix-electric/20 focus:border-nominix-electric transition-all resize-none"
                                                    />
                                                </div>

                                                {/* Simulation Section */}
                                                <div className="border-t border-gray-100 pt-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                            <DollarSign size={14} />
                                                            Vista Previa Monetaria
                                                        </h4>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={handleSimulate}
                                                            loading={loadingSimulation}
                                                            disabled={!startDate || !daysToEnjoy}
                                                            icon={RefreshCw}
                                                        >
                                                            Simular Pago
                                                        </Button>
                                                    </div>

                                                    {simulation && (
                                                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-2xl border border-green-100 animate-in fade-in slide-in-from-bottom-2">
                                                            {simulation.is_estimate && (
                                                                <div className="flex items-center gap-2 mb-4 p-2 bg-amber-50 rounded-lg text-amber-600">
                                                                    <AlertTriangle size={14} />
                                                                    <span className="text-xs font-bold">Estimación aproximada</span>
                                                                </div>
                                                            )}

                                                            {/* Grid 4 cajas: Días Hábiles, Descanso, Feriados, Bono */}
                                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                                <div className="bg-white/60 p-3 rounded-xl">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                                                                        Días Vacaciones
                                                                    </p>
                                                                    <p className="text-sm font-black text-gray-700">
                                                                        {formatCurrency(simulation.vacation_amount || simulation.salary_amount || 0)}
                                                                    </p>
                                                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                                                        {simulation.vacation_days || simulation.days} días hábiles
                                                                    </p>
                                                                </div>
                                                                <div className="bg-white/60 p-3 rounded-xl">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                                                                        Días Descanso
                                                                    </p>
                                                                    <p className="text-sm font-black text-gray-700">
                                                                        {formatCurrency(simulation.rest_amount || 0)}
                                                                    </p>
                                                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                                                        {simulation.rest_days || 0} sáb/dom
                                                                    </p>
                                                                </div>
                                                                <div className="bg-white/60 p-3 rounded-xl">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                                                                        Días Feriados
                                                                    </p>
                                                                    <p className="text-sm font-black text-gray-700">
                                                                        {formatCurrency(simulation.holiday_amount || 0)}
                                                                    </p>
                                                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                                                        {simulation.holiday_days || 0} feriados
                                                                    </p>
                                                                </div>
                                                                <div className="bg-white/60 p-3 rounded-xl">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                                                                        Bono Vacacional
                                                                    </p>
                                                                    <p className="text-sm font-black text-gray-700">
                                                                        {formatCurrency(simulation.bonus_amount || 0)}
                                                                    </p>
                                                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                                                        {simulation.bonus_days || 0} días
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Dual Currency Display */}
                                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                                {/* Columna USD */}
                                                                <div className="bg-green-600 text-white p-4 rounded-xl">
                                                                    <p className="text-[10px] font-bold uppercase opacity-80 mb-1">
                                                                        Neto USD
                                                                    </p>
                                                                    <p className="text-xl font-black">
                                                                        $ {(simulation.net_total || simulation.total || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                                    </p>
                                                                    <p className="text-[9px] opacity-70 mt-1">
                                                                        Bruto: $ {(simulation.gross_total || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                                    </p>
                                                                </div>

                                                                {/* Columna VES */}
                                                                <div className="bg-blue-600 text-white p-4 rounded-xl">
                                                                    <p className="text-[10px] font-bold uppercase opacity-80 mb-1">
                                                                        Neto Bs.
                                                                    </p>
                                                                    <p className="text-xl font-black">
                                                                        {simulation.net_total_ves
                                                                            ? `Bs. ${simulation.net_total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                                                            : 'N/A'
                                                                        }
                                                                    </p>
                                                                    <p className="text-[9px] opacity-70 mt-1">
                                                                        Tasa: {simulation.exchange_rate ? `${simulation.exchange_rate} Bs/$` : 'Sin tasa'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Indicador de base salarial usada */}
                                                            {simulation.vacation_salary_basis_display && (
                                                                <p className="text-[10px] text-gray-400 text-center">
                                                                    Base de cálculo: {simulation.vacation_salary_basis_display}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Submit Section */}
                                                <div className="border-t border-gray-100 pt-6">
                                                    {submitSuccess && (
                                                        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-xl text-sm font-bold animate-in fade-in">
                                                            <CheckCircle2 size={18} />
                                                            Solicitud creada exitosamente
                                                        </div>
                                                    )}

                                                    {submitError && (
                                                        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-500 rounded-xl text-sm font-bold animate-in fade-in">
                                                            <XCircle size={18} />
                                                            {submitError}
                                                        </div>
                                                    )}

                                                    <Button
                                                        variant="electric"
                                                        size="lg"
                                                        fullWidth
                                                        onClick={handleSubmitRequest}
                                                        loading={submitting}
                                                        disabled={!startDate || !daysToEnjoy || !calculatedEndDate}
                                                        icon={CheckCircle2}
                                                    >
                                                        Crear Solicitud de Vacaciones
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </RequirePermission>

                {/* ============ TAB B: CARGA MASIVA ============ */}
                <RequirePermission permission="vacations.add_vacationrequest">
                    <TabsContent value="bulk">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSpreadsheet size={18} />
                                    Carga Masiva desde Excel
                                </CardTitle>
                                <CardDescription>
                                    Suba un archivo Excel con múltiples solicitudes de vacaciones
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="max-w-2xl mx-auto space-y-6">
                                    {/* Instructions */}
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                                            <Info size={16} />
                                            Formato del Archivo
                                        </h4>
                                        <p className="text-sm text-blue-600 mb-3">
                                            El archivo Excel debe contener las siguientes columnas:
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-white/60 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-black text-blue-400 uppercase">Columna A</p>
                                                <p className="text-sm font-bold text-blue-700">ID</p>
                                                <p className="text-[9px] text-blue-500">Cédula (V-12345678)</p>
                                            </div>
                                            <div className="bg-white/60 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-black text-blue-400 uppercase">Columna B</p>
                                                <p className="text-sm font-bold text-blue-700">Date</p>
                                                <p className="text-[9px] text-blue-500">Fecha inicio</p>
                                            </div>
                                            <div className="bg-white/60 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-black text-blue-400 uppercase">Columna C</p>
                                                <p className="text-sm font-bold text-blue-700">Days</p>
                                                <p className="text-[9px] text-blue-500">Días solicitados</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upload Area */}
                                    <div
                                        className={cn(
                                            "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                                            bulkFile
                                                ? "border-nominix-electric bg-nominix-electric/5"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={(e) => setBulkFile(e.target.files[0])}
                                            className="hidden"
                                            id="bulk-file-input"
                                        />
                                        <label
                                            htmlFor="bulk-file-input"
                                            className="cursor-pointer block"
                                        >
                                            {bulkFile ? (
                                                <>
                                                    <FileSpreadsheet size={48} className="mx-auto mb-4 text-nominix-electric" />
                                                    <p className="font-bold text-nominix-dark">{bulkFile.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Clic para cambiar archivo
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={48} className="mx-auto mb-4 text-gray-300" />
                                                    <p className="font-bold text-gray-600">
                                                        Arrastre un archivo Excel o haga clic para seleccionar
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Formatos aceptados: .xlsx, .xls
                                                    </p>
                                                </>
                                            )}
                                        </label>
                                    </div>

                                    {/* Upload Button */}
                                    <Button
                                        variant="electric"
                                        size="lg"
                                        fullWidth
                                        onClick={handleBulkUpload}
                                        loading={uploadingBulk}
                                        disabled={!bulkFile}
                                        icon={Upload}
                                    >
                                        Procesar Archivo
                                    </Button>

                                    {/* Results */}
                                    {bulkResult && (
                                        <div className={cn(
                                            "p-5 rounded-2xl animate-in fade-in slide-in-from-bottom-2",
                                            bulkResult.error && !bulkResult.processed
                                                ? "bg-red-50 border border-red-100"
                                                : "bg-green-50 border border-green-100"
                                        )}>
                                            {bulkResult.error && !bulkResult.processed ? (
                                                <div className="flex items-center gap-3 text-red-600">
                                                    <XCircle size={24} />
                                                    <div>
                                                        <p className="font-bold">Error al procesar</p>
                                                        <p className="text-sm">{bulkResult.error}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3 text-green-600 mb-4">
                                                        <CheckCircle2 size={24} />
                                                        <div>
                                                            <p className="font-bold">Procesamiento completado</p>
                                                            <p className="text-sm">{bulkResult.message}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                                        <div className="bg-white/60 p-3 rounded-xl text-center">
                                                            <p className="text-2xl font-black text-green-600">
                                                                {bulkResult.processed}
                                                            </p>
                                                            <p className="text-xs text-green-600 font-bold">
                                                                Procesados correctamente
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/60 p-3 rounded-xl text-center">
                                                            <p className="text-2xl font-black text-amber-600">
                                                                {bulkResult.errors?.length || 0}
                                                            </p>
                                                            <p className="text-xs text-amber-600 font-bold">
                                                                Con errores
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Error Details */}
                                                    {bulkResult.errors?.length > 0 && (
                                                        <div className="bg-white/60 p-3 rounded-xl max-h-48 overflow-y-auto">
                                                            <p className="text-xs font-black text-gray-400 uppercase mb-2">
                                                                Detalles de errores
                                                            </p>
                                                            {bulkResult.errors.map((err, idx) => (
                                                                <div key={`${err.row}-${idx}`} className="flex items-start gap-2 text-xs py-1 border-b border-gray-100 last:border-0">
                                                                    <Badge variant="warning" size="xs">
                                                                        Fila {err.row}
                                                                    </Badge>
                                                                    <span className="text-gray-600">{err.error}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </RequirePermission>
                {/* ============ TAB: HISTORIAL / KARDEX ============ */}
                <RequirePermission permission="vacations.view_vacationbalance">
                    <TabsContent value="kardex">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Employee Selector */}
                            <div className="lg:col-span-1">
                                <EmployeeSelector
                                    employees={employees}
                                    onSelect={handleEmployeeSelect}
                                    isLoading={loadingEmployees}
                                />
                            </div>

                            {/* Kardex */}
                            <div className="lg:col-span-3">
                                <EmployeeVacationKardex
                                    employeeId={selectedEmployee?.id}
                                    employeeName={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : null}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </RequirePermission>
            </Tabs >
        </div >
    );
};

export default VacationManager;
