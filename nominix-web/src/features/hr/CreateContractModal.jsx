import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    X,
    Save,
    Loader2,
    Briefcase,
    Calendar,
    DollarSign,
    RefreshCcw,
    Clock,
    Hourglass, // Icono para duración
    ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';

const CreateContractModal = ({ isOpen, onClose, onSuccess, employeeId, currencies }) => {
    const [loading, setLoading] = useState(false);

    // Estado para controlar la UI del tipo de contrato
    const [contractType, setContractType] = useState('INDEFINITE'); // 'INDEFINITE' | 'FIXED'
    const [durationMonths, setDurationMonths] = useState(''); // Estado para los meses

    const [formData, setFormData] = useState({
        position: '',
        salary_amount: '',
        salary_currency: '',
        payment_frequency: 'MONTHLY',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true
    });

    // Resetear formulario al abrir
    useEffect(() => {
        if (isOpen && currencies.length > 0 && !formData.salary_currency) {
            const first = currencies[0];
            setFormData(prev => ({ ...prev, salary_currency: first.id || first.code }));
        }
    }, [isOpen, currencies]);

    // LÓGICA DE CÁLCULO DE FECHAS
    useEffect(() => {
        if (contractType === 'INDEFINITE') {
            setDurationMonths('');
            setFormData(prev => ({ ...prev, end_date: '' }));
        } else if (contractType === 'FIXED' && durationMonths && formData.start_date) {
            // Calcular fecha fin basada en meses
            try {
                const startDate = new Date(formData.start_date);
                // Sumar meses. Nota: setMonth maneja automáticamente el cambio de año
                startDate.setMonth(startDate.getMonth() + parseInt(durationMonths));

                // Formatear a YYYY-MM-DD
                const calculatedEndDate = startDate.toISOString().split('T')[0];

                setFormData(prev => ({ ...prev, end_date: calculatedEndDate }));
            } catch (e) {
                console.error("Error calculando fecha", e);
            }
        }
    }, [contractType, durationMonths, formData.start_date]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validaciones
        if (contractType === 'FIXED' && (!durationMonths || durationMonths <= 0)) {
            alert("Por favor indique la duración en meses del contrato.");
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            employee: employeeId,
            salary_amount: parseFloat(formData.salary_amount),
            // Si es indeterminado, enviamos null
            end_date: contractType === 'FIXED' ? formData.end_date : null
        };

        try {
            await axiosClient.post('/contracts/', payload);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error API:", error.response?.data);
            alert("Error al crear contrato. Verifique los datos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-nominix-dark/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-nominix-dark uppercase">Nuevo Contrato</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Definir relación laboral</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="overflow-y-auto p-8">
                    <form id="contract-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Cargo */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargo / Puesto</label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input
                                    type="text"
                                    name="position"
                                    required
                                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:border-nominix-electric outline-none text-nominix-dark"
                                    placeholder="Ej. Farmacéutico Regente"
                                    value={formData.position}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Salario y Moneda */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Salarial</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <input
                                        type="number"
                                        name="salary_amount"
                                        step="0.01"
                                        required
                                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:border-nominix-electric outline-none text-nominix-dark"
                                        placeholder="0.00"
                                        value={formData.salary_amount}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Moneda</label>
                                <select
                                    name="salary_currency"
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:border-nominix-electric outline-none text-nominix-dark"
                                    value={formData.salary_currency}
                                    onChange={handleChange}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {currencies.map((c, idx) => (
                                        <option key={c.id || c.code || idx} value={c.id || c.code}>
                                            {c.code} - {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Frecuencia y Tipo de Duración */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frecuencia Pago</label>
                                <div className="relative">
                                    <RefreshCcw className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <select
                                        name="payment_frequency"
                                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:border-nominix-electric outline-none text-nominix-dark appearance-none"
                                        value={formData.payment_frequency}
                                        onChange={handleChange}
                                    >
                                        <option value="WEEKLY">Semanal</option>
                                        <option value="BIWEEKLY">Quincenal</option>
                                        <option value="MONTHLY">Mensual</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo Contrato</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <select
                                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:border-nominix-electric outline-none text-nominix-dark appearance-none"
                                        value={contractType}
                                        onChange={(e) => setContractType(e.target.value)}
                                    >
                                        <option value="INDEFINITE">Indeterminado</option>
                                        <option value="FIXED">Tiempo Determinado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN DE FECHAS Y DURACIÓN */}
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha de Inicio</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <input
                                        type="date"
                                        name="start_date"
                                        required
                                        className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-xl font-bold text-sm focus:border-nominix-electric outline-none text-nominix-dark"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Campo de Meses (Solo si es Fijo) */}
                            {contractType === 'FIXED' && (
                                <div className="animate-in slide-in-from-top-2 duration-300 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-nominix-electric uppercase tracking-widest">Duración (Meses)</label>
                                        {formData.end_date && (
                                            <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border">
                                                Finaliza: {formData.end_date}
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Hourglass className="absolute left-4 top-1/2 -translate-y-1/2 text-nominix-electric" size={16} />
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                placeholder="Ej. 6"
                                                className="w-full pl-10 p-3 bg-white border border-nominix-electric/50 text-nominix-dark rounded-xl font-bold text-sm focus:ring-2 focus:ring-nominix-electric/20 outline-none"
                                                value={durationMonths}
                                                onChange={(e) => setDurationMonths(e.target.value)}
                                            />
                                        </div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">Meses</div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium pl-1">
                                        El sistema calculará la fecha de culminación automáticamente.
                                    </div>
                                </div>
                            )}
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex-shrink-0">
                    <button
                        form="contract-form"
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-nominix-electric text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-nominix-electric/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar Contrato
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateContractModal;