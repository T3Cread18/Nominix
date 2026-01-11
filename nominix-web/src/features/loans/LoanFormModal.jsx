
import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Banknote, Calendar, FileText, User } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

const LoanFormModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [currencies, setCurrencies] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        employee: '',
        amount: '',
        currency: 'USD',
        interest_rate: '0',
        num_installments: '1',
        frequency: 'ALL',
        start_date: new Date().toISOString().split('T')[0],
        description: '',
    });

    // Calculated Preview
    const [preview, setPreview] = useState({
        totalDebt: 0,
        installmentValue: 0
    });

    // Load Catalogs
    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                try {
                    const [empRes, currRes] = await Promise.all([
                        axiosClient.get('/employees/?page_size=1000&is_active=true'), // Simple list
                        axiosClient.get('/currencies/')
                    ]);
                    setEmployees(empRes.data.results || empRes.data);
                    setCurrencies(currRes.data.results || currRes.data);
                } catch (error) {
                    console.error("Error loading catalogs", error);
                    toast.error("Error cargando listas");
                }
            };
            loadData();
        }
    }, [isOpen]);

    // Auto-Calculate logic
    useEffect(() => {
        const principal = parseFloat(formData.amount) || 0;
        const interest = parseFloat(formData.interest_rate) || 0;
        const installments = parseInt(formData.num_installments) || 1;

        const total = principal * (1 + (interest / 100));
        const installment = installments > 0 ? total / installments : 0;

        setPreview({
            totalDebt: total,
            installmentValue: installment
        });
    }, [formData.amount, formData.interest_rate, formData.num_installments]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Send data to backend
            // Note: we only send the inputs, backend calculates balance/installments if not provided
            // But we can send them if we want to enforce specific values. 
            // Let's stick to sending the basic params and letting backend validate/calc or just use the defaults.
            // Actually, my backend logic runs IF balance is None. 
            // Django REST Framework defaults might be tricky.
            // Best approach: Send everything clean.

            const payload = {
                ...formData,
                status: 'APPROVED', // Auto-approve for now (or DRAFT)
            };

            await axiosClient.post('/loans/', payload);
            toast.success("Préstamo registrado exitosamente");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar préstamo");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/50">

                {/* Header */}
                <div className="bg-slate-50/50 p-6 flex items-center justify-between border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Banknote className="text-nominix-electric" size={24} />
                            Nuevo Préstamo
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Registrar Cuentas por Cobrar
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Empleado */}
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Empleado</label>
                        <div className="relative">
                            <select
                                required
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none font-bold text-slate-600 transition-all appearance-none"
                                value={formData.employee}
                                onChange={e => setFormData({ ...formData, employee: e.target.value })}
                            >
                                <option value="">Seleccione Colaborador...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.first_name} {emp.last_name} ({emp.national_id})
                                    </option>
                                ))}
                            </select>
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        </div>
                    </div>

                    {/* Monto y Moneda */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Monto Principal</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="0.01" step="0.01"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none font-bold text-slate-600"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                            />
                            <select
                                className="w-24 px-2 py-3 bg-slate-100 border border-slate-200 rounded-xl font-black text-xs text-slate-600 outline-none"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            >
                                {currencies.map(c => (
                                    <option key={c.code} value={c.code}>{c.code}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Interés */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Interés (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0" step="0.01"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none font-bold text-slate-600"
                                value={formData.interest_rate}
                                onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">%</div>
                        </div>
                    </div>

                    {/* Plazo y Frecuencia */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nro. Cuotas</label>
                        <input
                            type="number"
                            min="1" step="1"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none font-bold text-slate-600"
                            value={formData.num_installments}
                            onChange={e => setFormData({ ...formData, num_installments: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Frecuencia</label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none font-bold text-slate-600"
                            value={formData.frequency}
                            onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                        >
                            <option value="ALL">Todas las Nóminas</option>
                            <option value="2ND_Q">Solo Fin de Mes (2da Q)</option>
                        </select>
                    </div>

                    {/* Fecha y Descripción */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Fecha Inicio</label>
                        <div className="relative">
                            <input
                                type="date"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none font-bold text-slate-600"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Descripción</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none font-bold text-slate-600 placeholder:text-slate-400"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ej: Anticipo..."
                            />
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        </div>
                    </div>

                    {/* Resumen Calculado */}
                    <div className="col-span-2 mt-4 bg-nominix-electric/5 rounded-2xl p-6 border border-nominix-electric/10">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 mb-4">
                            <Calculator size={18} className="text-nominix-electric" /> Resumen de Proyección
                        </h4>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Deuda</p>
                                <p className="text-2xl font-black text-slate-800">
                                    {formData.currency} {preview.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto Cuota Est.</p>
                                <p className="text-2xl font-black text-nominix-electric">
                                    {formData.currency} {preview.installmentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="bg-slate-50/50 p-6 flex justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl font-bold text-white bg-nominix-dark hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Guardando...' : <><Save size={18} /> Crear Préstamo</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoanFormModal;
