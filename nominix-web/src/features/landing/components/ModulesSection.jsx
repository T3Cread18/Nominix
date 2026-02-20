import React from 'react';
import { Users, Calculator, Fingerprint, CalendarDays, Briefcase, FileText, BarChart3, Settings, Clock } from 'lucide-react';

const modules = [
    {
        icon: Users,
        name: 'Personal',
        desc: 'Gestión integral de expedientes, documentación y organigrama empresarial.',
        details: 'Fichas completas, carga de documentos, historial de cargos, datos bancarios y control de vencimientos.',
        gradient: 'from-blue-600 to-cyan-500',
        status: 'Disponible',
    },
    {
        icon: Calculator,
        name: 'Nómina',
        desc: 'Cálculos automáticos con conceptos configurables, cierre de períodos y recibos PDF.',
        details: 'Más de 20 conceptos predefinidos, asignaciones/deducciones, integración con préstamos y vacaciones.',
        gradient: 'from-purple-600 to-pink-500',
        status: 'Disponible',
    },
    {
        icon: Fingerprint,
        name: 'Biometría',
        desc: 'Sincronización con Hikvision, mapeo de empleados y reportes de asistencia diaria.',
        details: 'Soporte multi-dispositivo, sincronización programada, detección de anomalías y filtro anti-rebote.',
        gradient: 'from-emerald-600 to-teal-500',
        status: 'Disponible',
    },
    {
        icon: CalendarDays,
        name: 'Vacaciones',
        desc: 'Cálculo LOTTT automático, días adicionales por antigüedad, recibos y simulaciones.',
        details: 'Flujo de aprobación, simulación pre-pago, bono vacacional y adelanto de vacaciones.',
        gradient: 'from-amber-500 to-orange-500',
        status: 'Disponible',
    },
    {
        icon: Briefcase,
        name: 'Préstamos',
        desc: 'Gestión de préstamos al personal con planes de cuotas y descuento automático en nómina.',
        details: 'Cálculo de cuotas, integración con cierre de nómina, historial de pagos y saldos pendientes.',
        gradient: 'from-rose-500 to-red-500',
        status: 'Disponible',
    },
    {
        icon: FileText,
        name: 'Importación',
        desc: 'Carga masiva de datos desde Excel con validación inteligente y mapeo de columnas.',
        details: 'Detección automática de formato, preview de datos, validación de cédulas y duplicados.',
        gradient: 'from-indigo-500 to-violet-500',
        status: 'Disponible',
    },
    {
        icon: Clock,
        name: 'Asistencia',
        desc: 'Dashboard de asistencia diaria con estado por empleado y reportes de puntualidad.',
        details: 'Vista diaria/semanal, filtros por departamento, estadísticas de llegadas tardías y ausencias.',
        gradient: 'from-teal-500 to-cyan-500',
        status: 'Disponible',
    },
    {
        icon: Settings,
        name: 'Configuración',
        desc: 'Panel de administración para políticas de nómina, vacaciones y datos de la empresa.',
        details: 'Logo, datos fiscales, políticas de HE, calendario de feriados y tasa de cambio.',
        gradient: 'from-gray-500 to-slate-500',
        status: 'Disponible',
    },
    {
        icon: BarChart3,
        name: 'Reportes',
        desc: 'Generación de reportes consolidados, exportación a Excel y gráficas interactivas.',
        details: 'Resumen de nómina, listado ARI, reportes de asistencia y análisis de costos laborales.',
        gradient: 'from-sky-500 to-blue-500',
        status: 'Próximamente',
    },
];

const ModulesSection = () => {
    return (
        <section id="modules" aria-label="Módulos de la plataforma Nominix" className="py-28 relative">
            <div className="absolute inset-0 bg-[#08080D]" aria-hidden="true" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-20">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-purple-400 mb-4">
                        Módulos
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Una plataforma,
                        <br />
                        <span className="text-gray-500">múltiples soluciones</span>
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto text-lg">
                        Cada módulo está diseñado para integrarse sin fricción con los demás. Actívalos según tus necesidades.
                    </p>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((mod, idx) => {
                        const Icon = mod.icon;
                        return (
                            <div
                                key={idx}
                                className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                            >
                                {/* Gradient glow on hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${mod.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                                {/* Status badge */}
                                <div className="absolute top-4 right-4">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${mod.status === 'Disponible'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-amber-500/10 text-amber-400'
                                        }`}>
                                        {mod.status}
                                    </span>
                                </div>

                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className="w-7 h-7 text-white" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                                    {mod.name}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                    {mod.desc}
                                </p>
                                <p className="text-gray-600 text-xs leading-relaxed">
                                    {mod.details}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ModulesSection;
