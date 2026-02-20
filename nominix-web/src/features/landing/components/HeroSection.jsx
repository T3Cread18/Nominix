import React from 'react';
import { ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { getAdminUrl } from './Navbar';

const HeroSection = () => {
    return (
        <section id="hero" aria-label="Presentación de Nominix" className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 -z-10" aria-hidden="true">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[150px] animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[150px] animate-float" style={{ animationDelay: '3s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[200px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-16 text-center relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-10 opacity-0 animate-fade-in-up">
                    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-semibold tracking-wider text-blue-300 uppercase">
                        Plataforma de RRHH · v2.0
                    </span>
                </div>

                {/* h1 — Single H1 per page for SEO */}
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[0.95] mb-8 opacity-0 animate-fade-in-up-delay">
                    Gestión de talento humano
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        sin complicaciones
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 leading-relaxed mb-12 opacity-0 animate-fade-in-up-delay-2">
                    Software de nómina multimoneda, control biométrico Hikvision y cumplimiento LOTTT.
                    Todo unificado en una plataforma rápida, moderna y hecha para empresas en Venezuela.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 opacity-0 animate-fade-in-up-delay-2">
                    <a
                        href={getAdminUrl()}
                        className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg transition-all duration-300 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 flex items-center justify-center gap-3 hover:gap-4"
                        rel="noopener"
                    >
                        Comenzar Ahora
                        <ArrowRight className="w-5 h-5 transition-all" aria-hidden="true" />
                    </a>
                    <a
                        href="#modules"
                        className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 hover:border-white/20 font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3"
                    >
                        <Play size={18} className="text-blue-400" aria-hidden="true" />
                        Ver Módulos
                    </a>
                </div>

                {/* Trust badges with keyword-rich text */}
                <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-gray-500 font-medium list-none" aria-label="Ventajas clave">
                    {[
                        'Adaptado a la Ley del Trabajo (LOTTT)',
                        'Nómina en USD y Bolívares',
                        'Biometría Hikvision Nativa',
                        'Multi-empresa SaaS',
                    ].map(badge => (
                        <li key={badge} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500/80" aria-hidden="true" />
                            <span>{badge}</span>
                        </li>
                    ))}
                </ul>

                {/* Stats counter */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto" aria-label="Estadísticas del sistema">
                    {[
                        { value: '78+', label: 'Empleados Gestionados' },
                        { value: '24/7', label: 'Biometría Online' },
                        { value: '2', label: 'Monedas Soportadas' },
                        { value: '100%', label: 'Cumplimiento Legal' },
                    ].map((stat) => (
                        <div key={stat.label} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="text-2xl md:text-3xl font-black text-white mb-1" aria-label={`${stat.value} ${stat.label}`}>
                                {stat.value}
                            </div>
                            <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
