import React from 'react';
import { Users, CreditCard, Fingerprint, BarChart3, ShieldCheck, Zap, Clock, Globe, Building2, FileCheck, Calculator, CalendarDays } from 'lucide-react';

const features = [
    {
        icon: Users, color: 'blue',
        title: "Gestión de Personal",
        description: "Expedientes digitales completos con control de documentación, ciclo de vida del empleado y organigrama visual.",
        bullets: ['Ficha del empleado completa', 'Control de documentos vencidos', 'Historial de cargos y movimientos'],
    },
    {
        icon: CreditCard, color: 'purple',
        title: "Nómina Multimoneda",
        description: "Cálculos precisos en Bolívares y Dólares con tasa BCV automática. Recibos de pago profesionales.",
        bullets: ['Conceptos 100% configurables', 'Cierre de períodos auditado', 'Recibos PDF con doble moneda'],
    },
    {
        icon: Fingerprint, color: 'emerald',
        title: "Control Biométrico",
        description: "Integración nativa con terminales Hikvision. Sincronización y reportes de asistencia diaria.",
        bullets: ['Sincronización automática', 'Reporte de llegadas tardías', 'Mapeo empleado ↔ dispositivo'],
    },
    {
        icon: CalendarDays, color: 'amber',
        title: "Vacaciones LOTTT",
        description: "Cálculo automático de días según antigüedad, bono vacacional y generación de recibos.",
        bullets: ['Días adicionales por antigüedad', 'Simulación antes de aprobar', 'Recibos de vacaciones PDF'],
    },
    {
        icon: ShieldCheck, color: 'indigo',
        title: "Auditoría y Seguridad",
        description: "Traza de auditoría con fórmulas explicadas, roles granulares y protección de datos sensibles.",
        bullets: ['Tooltips con fórmulas detalladas', 'Roles por módulo', 'Log de acciones clave'],
    },
    {
        icon: Zap, color: 'rose',
        title: "Automatización Total",
        description: "Reduce la carga operativa con cálculos automáticos de prestaciones, liquidaciones y reportes.",
        bullets: ['Novedades automáticas', 'Descuento de préstamos en nómina', 'Importación masiva desde Excel'],
    },
    {
        icon: Globe, color: 'cyan',
        title: "Multi-Empresa (SaaS)",
        description: "Cada empresa tiene su propio espacio aislado con datos independientes y configuración propia.",
        bullets: ['Esquemas separados por tenant', 'Panel de superadmin', 'Dominio personalizado por empresa'],
    },
    {
        icon: Building2, color: 'orange',
        title: "Configuración por Empresa",
        description: "Cada empresa configura sus propias políticas de nómina, vacaciones, horarios y conceptos.",
        bullets: ['Políticas de horas extra', 'Calendario de feriados', 'Tasa de cambio configurada'],
    },
    {
        icon: Clock, color: 'teal',
        title: "Asistencia en Tiempo Real",
        description: "Dashboard de asistencia diaria con estado de cada empleado: presente, ausente, tardanza.",
        bullets: ['Vista diaria por empleado', 'Filtros por departamento', 'Exportación a Excel'],
    },
];

const colorMap = {
    blue: { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'group-hover:border-blue-500/20' },
    purple: { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'group-hover:border-purple-500/20' },
    emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'group-hover:border-emerald-500/20' },
    amber: { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'group-hover:border-amber-500/20' },
    indigo: { icon: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'group-hover:border-indigo-500/20' },
    rose: { icon: 'text-rose-400', bg: 'bg-rose-500/10', border: 'group-hover:border-rose-500/20' },
    cyan: { icon: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'group-hover:border-cyan-500/20' },
    orange: { icon: 'text-orange-400', bg: 'bg-orange-500/10', border: 'group-hover:border-orange-500/20' },
    teal: { icon: 'text-teal-400', bg: 'bg-teal-500/10', border: 'group-hover:border-teal-500/20' },
};

const FeaturesSection = () => {
    return (
        <section id="features" aria-label="Características del software de RRHH Nominix" className="py-28 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0D0D14] to-[#0A0A0F]" aria-hidden="true" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4">
                        Características
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Todo lo que necesitas,
                        <br />
                        <span className="text-gray-500">nada que no necesites</span>
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto text-lg">
                        9 módulos integrados diseñados para simplificar cada aspecto de la gestión de RRHH en Venezuela.
                    </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature, idx) => {
                        const colors = colorMap[feature.color];
                        const Icon = feature.icon;
                        return (
                            <div
                                key={idx}
                                className={`group p-7 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] ${colors.border} transition-all duration-500 hover:-translate-y-1`}
                            >
                                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                                    {feature.description}
                                </p>
                                <ul className="space-y-1.5">
                                    {feature.bullets.map((b, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                            <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
