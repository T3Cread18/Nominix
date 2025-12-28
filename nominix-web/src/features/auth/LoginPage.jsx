import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    Lock,
    User,
    ChevronRight,
    Loader2,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const LoginPage = () => {
    const { login, tenant } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(formData.username, formData.password);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesión. Revisa tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-nominix-smoke flex items-center justify-center p-4 font-sans antialiased text-nominix-dark">
            <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-4 bg-nominix-electric rounded-3xl shadow-xl shadow-nominix-electric/30 mb-4 transform -rotate-6">
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-nominix-dark">NÓMINIX</h1>
                    {tenant ? (
                        <div className="mt-2 inline-block px-3 py-1 bg-nominix-dark text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                            {tenant.name}
                        </div>
                    ) : (
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Acceso Colaboradores</p>
                    )}
                </div>

                {/* Formulario */}
                <div className="bg-nominix-surface p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                    {/* Decoración sutil */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-nominix-electric/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                    <h2 className="text-xl font-bold mb-8 text-center">¡Bienvenido de nuevo!</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 animate-shake">
                            <AlertCircle className="text-red-500 shrink-0" size={20} />
                            <p className="text-xs text-red-700 font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={12} /> Usuario o Cédula
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-nominix-electric focus:ring-0 focus:outline-none font-bold transition-all pr-12"
                                    placeholder="Ej: admin"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Lock size={12} /> Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    required
                                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-nominix-electric focus:ring-0 focus:outline-none font-bold transition-all pr-12"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full bg-nominix-electric text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-nominix-electric/20",
                                "hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50",
                                "flex items-center justify-center gap-2 uppercase tracking-widest overflow-hidden group"
                            )}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Ingresar al Sistema
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Software de Nómina Adaptado a LOTTT
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                    &copy; 2025 NÓMINIX VZLA - SAAS EDITION
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
