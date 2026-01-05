import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Loader2, Calendar, DollarSign, Briefcase, Building2, Info, Calculator, RefreshCw } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import { toast } from 'sonner';
import DepartmentSelector from '../../../components/DepartmentSelector';

const UpsertContractModal = ({ isOpen, onClose, onSuccess, employeeId, employeeData, contractToEdit = null }) => {
    const [loading, setLoading] = useState(false);

    // --- NUEVO: ESTADO PARA TASA DE CAMBIO ---
    const [tasaCambio, setTasaCambio] = useState(0); // Iniciamos en 0 para detectar carga
    const [loadingTasa, setLoadingTasa] = useState(true);

    // Constante fija solo para el Cestaticket (Valor de Ley)
    const MONTO_CESTATICKET_USD = 40.00;

    // Estado inicial del formulario
    const initialForm = {
        contract_type: 'INDEFINITE',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        salary_amount: '',
        base_salary_bs: '130',
        salary_currency: 'USD',
        payment_frequency: 'BIWEEKLY',
        position: '',
        department: '',
        work_schedule: 'Lunes a Viernes 8:00 AM - 5:00 PM',
        notes: ''
    };

    const [formData, setFormData] = useState(initialForm);

    // --- 1. CARGAR TASA BCV AL ABRIR ---
    useEffect(() => {
        const fetchRate = async () => {
            if (!isOpen) return;
            setLoadingTasa(true);
            try {
                // Ajusta esta URL a tu endpoint real de Django
                // Ejemplo: Devuelve { "rate": 64.50, "date": "2025-01-02" }
                const res = await axiosClient.get('/exchange-rates/latest/?currency=USD');

                // Si tu API devuelve directo el número o un objeto, ajústalo aquí:
                const rate = res.data.rate || res.data.value || 60.00;
                setTasaCambio(parseFloat(rate));
            } catch (error) {
                console.error("Error obteniendo tasa BCV:", error);
                toast.error("No se pudo obtener tasa BCV. Usando referencia.");
                setTasaCambio(60.00); // Fallback de seguridad
            } finally {
                setLoadingTasa(false);
            }
        };

        fetchRate();
    }, [isOpen]);

    // Inicializar Formulario
    useEffect(() => {
        if (isOpen) {
            if (contractToEdit) {
                setFormData({
                    ...contractToEdit,
                    end_date: contractToEdit.end_date || '',
                    department: contractToEdit.department?.id || contractToEdit.department || '',
                    notes: contractToEdit.notes || '',
                    base_salary_bs: contractToEdit.base_salary_bs || '130'
                });
            } else {
                setFormData(initialForm);
                if (employeeData?.department) {
                    setFormData(prev => ({
                        ...prev,
                        department: employeeData.department.id || employeeData.department
                    }));
                }
            }
        }
    }, [isOpen, contractToEdit]);

    // --- 2. CÁLCULO DINÁMICO USANDO TASA DEL API ---
    const calculateBreakdown = useCallback(() => {
        const totalPackageUsd = parseFloat(formData.salary_amount) || 0;
        const baseBs = parseFloat(formData.base_salary_bs) || 0;

        // Usamos el estado tasaCambio
        const currentRate = tasaCambio || 1;

        const totalPackageBs = totalPackageUsd * currentRate;
        const cestaTicketBs = MONTO_CESTATICKET_USD * currentRate;

        let complementoBs = totalPackageBs - baseBs - cestaTicketBs;
        if (complementoBs < 0) complementoBs = 0;

        return { totalPackageBs, cestaTicketBs, complementoBs, baseBs };
    }, [formData.salary_amount, formData.base_salary_bs, tasaCambio]);

    const breakdown = calculateBreakdown();

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (formData.contract_type !== 'INDEFINITE' && !formData.end_date) {
            toast.error("La fecha de fin es obligatoria para este tipo de contrato");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                employee: employeeId,
                department: formData.department
            };

            if (employeeData?.branch) {
                payload.branch = employeeData.branch.id || employeeData.branch;
            }
            if (!payload.end_date) payload.end_date = null;

            if (contractToEdit) {
                await axiosClient.put(`/contracts/${contractToEdit.id}/`, payload);
                toast.success("Contrato actualizado");
            } else {
                await axiosClient.post('/contracts/', payload);
                toast.success("Contrato registrado exitosamente");
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data ? JSON.stringify(error.response.data) : "Error al guardar contrato";
            toast.error("Verifique los datos del formulario");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-nominix-dark/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-nominix-dark">
                            {contractToEdit ? 'Editar Contrato' : 'Nuevo Contrato'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                Definir condiciones laborales
                            </p>
                            {/* INDICADOR DE TASA EN EL HEADER */}
                            <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black border border-blue-100 flex items-center gap-1">
                                {loadingTasa ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                Tasa BCV: {loadingTasa ? '...' : `Bs. ${tasaCambio.toFixed(2)}`}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Layout Flexible */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

                    {/* COLUMNA IZQUIERDA: FORMULARIO */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Tipo de Contrato */}
                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo de Contrato</label>
                                <select
                                    name="contract_type"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                    value={formData.contract_type}
                                    onChange={handleChange}
                                >
                                    <option value="INDEFINITE">Tiempo Indeterminado</option>
                                    <option value="FIXED_TERM">Tiempo Determinado</option>
                                    <option value="PROJECT">Por Obra Determinada</option>
                                </select>
                            </div>

                            {/* Fechas */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Fecha Inicio</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input
                                        type="date"
                                        name="start_date"
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {formData.contract_type !== 'INDEFINITE' && (
                                <div className="col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider text-nominix-electric">Fecha Fin *</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-nominix-electric/50" size={18} />
                                        <input
                                            type="date"
                                            name="end_date"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                            value={formData.end_date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN SALARIAL */}
                            <div className="col-span-2 border-t border-b border-gray-100 py-4 my-2 space-y-4">
                                <h4 className="text-xs font-black uppercase text-nominix-electric tracking-widest flex items-center gap-2">
                                    <DollarSign size={14} /> Esquema Salarial Venezuela
                                </h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400">Total Paquete ($)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="salary_amount"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                className="w-full pl-8 pr-4 py-3 bg-white border-2 border-nominix-electric/20 rounded-xl focus:border-nominix-electric outline-none font-black text-lg text-slate-800 transition-all"
                                                value={formData.salary_amount}
                                                onChange={handleChange}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nominix-electric font-bold">$</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400">Sueldo Base (Bs)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="base_salary_bs"
                                                step="0.01"
                                                required
                                                placeholder="130.00"
                                                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none font-bold text-sm text-slate-600 transition-all"
                                                value={formData.base_salary_bs}
                                                onChange={handleChange}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Bs</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400">Moneda Referencia</label>
                                        <select
                                            name="salary_currency"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none font-bold text-xs"
                                            value={formData.salary_currency}
                                            onChange={handleChange}
                                        >
                                            <option value="USD">USD (Dólar)</option>
                                            <option value="VES">VES (Bolívar)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400">Frecuencia</label>
                                        <select
                                            name="payment_frequency"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none font-bold text-xs"
                                            value={formData.payment_frequency}
                                            onChange={handleChange}
                                        >
                                            <option value="BIWEEKLY">Quincenal</option>
                                            <option value="WEEKLY">Semanal</option>
                                            <option value="MONTHLY">Mensual</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Detalles de Cargo y Depto */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Cargo</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input
                                        type="text"
                                        name="position"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                        value={formData.position}
                                        onChange={handleChange}
                                        placeholder="Ej. Gerente"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Departamento</label>
                                <DepartmentSelector
                                    branchId={employeeData?.branch?.id || employeeData?.branch}
                                    value={formData.department}
                                    onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Horario</label>
                                <input
                                    type="text"
                                    name="work_schedule"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                    value={formData.work_schedule}
                                    onChange={handleChange}
                                />
                            </div>

                        </div>
                    </form>

                    {/* COLUMNA DERECHA: SIMULADOR DE NOMINA */}
                    <div className="w-full md:w-[300px] bg-gray-50 p-6 border-l border-gray-100 flex flex-col overflow-y-auto">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                            <Calculator size={14} /> Simulación
                        </h4>

                        {/* Spinner de carga si la tasa no ha llegado */}
                        {loadingTasa ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2">
                                <Loader2 className="animate-spin" size={24} />
                                <p className="text-[10px] font-bold uppercase">Consultando BCV...</p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                {/* Concepto 1: Sueldo Base */}
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[9px] font-black uppercase text-slate-500">Sueldo Base</span>
                                        <span className="text-xs font-bold text-slate-800">Bs. {breakdown.baseBs.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[8px] text-green-600 font-bold">Incide Prestaciones</p>
                                </div>

                                {/* Concepto 2: Cestaticket */}
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[9px] font-black uppercase text-slate-500">Cestaticket</span>
                                        <span className="text-xs font-bold text-slate-800">Bs. {breakdown.cestaTicketBs.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[8px] text-gray-400">Ref. ${MONTO_CESTATICKET_USD}</p>
                                </div>

                                {/* Concepto 3: Complemento */}
                                <div className="bg-white p-3 rounded-xl border border-nominix-electric/30 bg-nominix-electric/5 shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-1 relative z-10">
                                        <span className="text-[9px] font-black uppercase text-nominix-electric">Complemento</span>
                                        <span className="text-xs font-bold text-nominix-electric">Bs. {breakdown.complementoBs.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[8px] text-nominix-electric/70 relative z-10">Bono No Salarial</p>
                                </div>

                                <div className="border-t border-gray-200 my-2"></div>

                                <div className="mt-4 p-3 bg-blue-50 rounded-xl flex gap-2 items-start">
                                    <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-[9px] text-blue-600 leading-relaxed">
                                        Cálculo real utilizando Tasa BCV Oficial: <strong>Bs. {tasaCambio.toFixed(2)}</strong>.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-6 flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={loading || loadingTasa} // Deshabilitar si carga la tasa
                                className="w-full py-3 bg-nominix-electric text-white rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-nominix-electric/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default UpsertContractModal;