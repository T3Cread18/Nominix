import React, { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import { toast } from 'sonner';
import {
    RefreshCcw, Plus, Calendar, DollarSign,
    TrendingUp, History, Info, Loader2, X, Search
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ExchangeRatesManager = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currencies, setCurrencies] = useState([]);

    const [formData, setFormData] = useState({
        currency: 'USD',
        rate: '',
        date_valid: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        source: 'BCV',
        notes: ''
    });

    useEffect(() => {
        loadRates();
        loadCurrencies();
    }, []);

    const loadRates = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/exchange-rates/');
            setRates(res.data.results || res.data);
        } catch (error) {
            toast.error("Error al cargar el historial de tasas");
        } finally {
            setLoading(false);
        }
    };

    const loadCurrencies = async () => {
        try {
            const res = await axiosClient.get('/currencies/');
            setCurrencies(res.data.results || res.data);
        } catch (e) { }
    };

    const handleSyncBCV = async () => {
        setSyncing(true);
        try {
            const res = await axiosClient.post('/exchange-rates/sync-bcv/');
            toast.success("Tasas sincronizadas con éxito desde el BCV");
            loadRates();
        } catch (error) {
            toast.error("Error al sincronizar con el BCV");
        } finally {
            setSyncing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axiosClient.post('/exchange-rates/', formData);
            toast.success("Tasa registrada correctamente");
            setIsModalOpen(false);
            loadRates();
        } catch (error) {
            toast.error("Error al registrar la tasa. Verifique los datos.");
        }
    };

    // Tasa más reciente para el dashboard superior
    const latestRate = rates[0];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- HEADER & DASHBOARD --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-nominix-dark to-[#1a1a2e] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-nominix-dark/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-nominix-electric/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-black tracking-tighter mb-2">Monitor de Divisas</h2>
                            <p className="text-nominix-electric/70 text-sm font-bold uppercase tracking-widest">Gestión de Tipos de Cambio Oficiales</p>
                        </div>
                        <button
                            onClick={handleSyncBCV}
                            disabled={syncing}
                            className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl flex items-center gap-3 hover:bg-white/20 transition-all group active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCcw size={20} className={cn("text-nominix-electric group-hover:rotate-180 transition-transform duration-500", syncing && "animate-spin")} />
                            <span className="text-xs font-black uppercase tracking-widest">{syncing ? 'Sincronizando...' : 'Actualizar BCV'}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                        {rates.slice(0, 4).map((rate, i) => (
                            <div key={rate.id} className={cn(
                                "p-4 rounded-3xl border transition-all",
                                i === 0 ? "bg-nominix-electric/20 border-nominix-electric/30" : "bg-white/5 border-white/10"
                            )}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black opacity-50 uppercase">{rate.currency_data?.code || 'USD'}</span>
                                    {i === 0 && <span className="bg-nominix-electric text-[8px] font-black px-1.5 py-0.5 rounded-full">LIVE</span>}
                                </div>
                                <div className="text-xl font-black">Bs. {parseFloat(rate.rate).toFixed(2)}</div>
                                <div className="text-[10px] font-bold opacity-40 mt-1">{format(new Date(rate.date_valid), 'dd MMM, HH:mm')}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-nominix-dark mb-4 group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <h3 className="text-xl font-black text-nominix-dark mb-2">Ajuste Manual</h3>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">Si necesitas registrar una tasa específica para un periodo cerrado o consultoría externa.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full py-4 bg-nominix-dark text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-nominix-dark/10 mt-6"
                    >
                        Registrar Tasa
                    </button>
                </div>
            </div>

            {/* --- TABLE SECTION --- */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-nominix-electric/10 text-nominix-electric rounded-2xl">
                            <History size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-nominix-dark">Historial de Tasas</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registro auditable de variaciones cambiarias</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Moneda</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor (VES)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Validez</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fuente</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-gray-300" />
                                    </td>
                                </tr>
                            ) : rates.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-gray-300 font-bold uppercase text-xs">No hay registros</td>
                                </tr>
                            ) : rates.map((rate, i) => (
                                <tr key={rate.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-black text-[10px]">
                                                {rate.currency_data?.code}
                                            </div>
                                            <span className="text-sm font-bold text-nominix-dark">{rate.currency_data?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-black text-nominix-dark">Bs. {parseFloat(rate.rate).toFixed(4)}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-gray-500">
                                            {format(new Date(rate.date_valid), "d 'de' MMMM, HH:mm", { locale: es })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                                            rate.source === 'BCV' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                                        )}>
                                            {rate.source_display}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-bold text-gray-400 italic">
                                            {format(new Date(rate.created_at), 'dd/MM/yy HH:mm')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL DE REGISTRO --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nominix-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-nominix-dark tracking-tighter">Registrar Tasa</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 px-2">Moneda</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-nominix-electric/20"
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    >
                                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 px-2">Valor en Bs.</label>
                                    <input
                                        type="number" step="0.000001" required
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-nominix-electric/20"
                                        value={formData.rate}
                                        onChange={e => setFormData({ ...formData, rate: e.target.value })}
                                        placeholder="0.000000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 px-2">Fecha y Hora</label>
                                    <input
                                        type="datetime-local" required
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-nominix-electric/20"
                                        value={formData.date_valid}
                                        onChange={e => setFormData({ ...formData, date_valid: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 px-2">Fuente</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-nominix-electric/20"
                                        value={formData.source}
                                        onChange={e => setFormData({ ...formData, source: e.target.value })}
                                    >
                                        <option value="BCV">BCV</option>
                                        <option value="MONITOR">Monitor Dólar</option>
                                        <option value="PARALELO">Paralelo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 px-2">Observaciones</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-nominix-electric/20 h-24 resize-none"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <button className="w-full py-5 bg-nominix-electric text-white rounded-3xl font-black uppercase text-xs tracking-[0.3em] hover:shadow-xl shadow-nominix-electric/30 transition-all active:scale-[0.98]">
                                Guardar Registro
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExchangeRatesManager;
