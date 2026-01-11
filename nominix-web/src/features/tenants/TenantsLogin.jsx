import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Loader2, KeyRound, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const TenantsLogin = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ username: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(form.username, form.password);
            toast.success('Acceso concedido al Panel Maestro');
            navigate('/tenants/admin');
        } catch (error) {
            toast.error('Credenciales de administrador inválidas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-6 selection:bg-nominix-electric/30">
            {/* Fondo con Efecto de Gradiente Radial */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nominix-electric/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo / Icono */}
                <div className="flex flex-col items-center mb-10 group">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl backdrop-blur-xl group-hover:border-nominix-electric/50 transition-all duration-500 group-hover:shadow-nominix-electric/10">
                        <ShieldCheck className="text-nominix-electric group-hover:scale-110 transition-transform duration-500" size={40} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter italic">
                        NÓMINIX <span className="text-nominix-electric not-italic ml-1">MASTER</span>
                    </h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Acceso Restringido a Sistemas</p>
                </div>

                {/* Card de Formulario */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-2xl shadow-3xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuario Maestro</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-nominix-electric transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-nominix-electric/50 focus:ring-4 focus:ring-nominix-electric/5 transition-all"
                                    placeholder="Identificador admin"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Clave de Acceso</label>
                            <div className="relative group">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-nominix-electric transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-nominix-electric/50 focus:ring-4 focus:ring-nominix-electric/5 transition-all"
                                    placeholder="••••••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-nominix-electric hover:bg-nominix-electric/90 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-nominix-electric/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Autenticar Sistema'}
                        </button>
                    </form>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-gray-600 text-[9px] uppercase font-bold tracking-[0.2em]">
                        Panel de Control Nominix SaaS &copy; 2025
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TenantsLogin;
