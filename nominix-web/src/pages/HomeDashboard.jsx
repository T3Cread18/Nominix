import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Users, Calculator, ClipboardList, Calendar, Fingerprint,
    Settings, ShieldCheck, FileSpreadsheet, Banknote, Shield, PieChart
} from 'lucide-react';
import { cn } from '../utils/cn';
import DashboardMetrics from './components/DashboardMetrics';
import PendingTasksWidget from './components/PendingTasksWidget';
import UpcomingEventsWidget from './components/UpcomingEventsWidget';

/**
 * HomeDashboard - Portal principal de la aplicación.
 * Muestra tarjetas de acceso rápido a los módulos permitidos para el usuario actual.
 */
const HomeDashboard = () => {
    const { user, tenant, hasPermission } = useAuth();
    const navigate = useNavigate();

    // Main modules (Big Cards)
    const mainModules = [
        { path: '/personnel', icon: Users, title: 'Personal', desc: 'Gestión de expedientes y estructura', perm: 'payroll_core.view_menu_personnel', color: 'from-blue-500 to-indigo-600' },
        { path: '/payroll', icon: Calculator, title: 'Nómina', desc: 'Cálculos procesales y cierres', perm: 'payroll_core.view_menu_payroll', color: 'from-emerald-500 to-teal-600' },
        { path: '/catalog', icon: ClipboardList, title: 'Conceptos', desc: 'Catálogo salarial y deducciones', perm: 'payroll_core.view_menu_catalog', color: 'from-amber-500 to-orange-600' },
        { path: '/vacations', icon: Calendar, title: 'Vacaciones', desc: 'Solicitudes y provisiones', perm: 'payroll_core.view_menu_vacations', color: 'from-rose-500 to-pink-600' },
        { path: '/attendance', icon: Fingerprint, title: 'Asistencia', desc: 'Biométricos y marcajes', perm: 'payroll_core.view_menu_attendance', color: 'from-cyan-500 to-blue-600' },
    ];

    // Secondary modules (Smaller Cards)
    const secondaryModules = [
        { path: '/loans', icon: Banknote, title: 'Préstamos', perm: 'payroll_core.view_menu_loans' },
        { path: '/declarations', icon: Shield, title: 'Ley y Gob.', perm: 'payroll_core.view_menu_declarations' },
        { path: '/reports', icon: PieChart, title: 'Reportes', perm: 'payroll_core.view_menu_reports' },
        { path: '/import', icon: FileSpreadsheet, title: 'Importaciones masivas', perm: 'payroll_core.view_menu_import' },
        { path: '/config', icon: Settings, title: 'Configuración', perm: 'payroll_core.view_menu_config' },
        { path: '/audit-logs', icon: ShieldCheck, title: 'Bitácora', role: 'Administrador' }
    ];

    // Filter cards based on user permissions or roles
    const visibleMainModules = mainModules.filter(mod => {
        if (mod.role && user?.role !== mod.role) return false;
        if (mod.perm && !hasPermission(mod.perm)) return false;
        return true;
    });

    const visibleSecondaryModules = secondaryModules.filter(mod => {
        if (mod.role && user?.role !== mod.role) return false;
        if (mod.perm && !hasPermission(mod.perm)) return false;
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header de Bienvenida */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/60 shadow-sm relative overflow-hidden">
                {/* Elementos decorativos */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-nominix-electric/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 pointer-events-none"></div>

                <div className="relative z-10 w-full">
                    <p className="text-sm font-bold text-nominix-electric tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
                        <span>Workspace</span> • <span>{tenant?.schema_name || 'Nóminix SaaS'}</span>
                    </p>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
                        Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-nominix-electric to-blue-600">{user?.first_name || 'Usuario'}</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl text-lg">
                        Selecciona el módulo en el que deseas trabajar hoy.
                    </p>
                </div>

                {visibleSecondaryModules.length > 0 && (
                    <div className="relative z-10 hidden lg:block shrink-0 bg-white/60 p-4 rounded-3xl border border-white/80 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Accesos Rápidos</p>
                        <div className="flex gap-2">
                            {visibleSecondaryModules.slice(0, 3).map((mod, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(mod.path)}
                                    className="p-3 bg-white hover:bg-nominix-electric hover:text-white rounded-2xl text-slate-600 transition-all duration-300 shadow-sm hover:shadow-md group"
                                    title={mod.title}
                                >
                                    <mod.icon size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Fila superior de KPIs (Widgets) */}
            {hasPermission('payroll_core.view_dashboard_metrics') && <DashboardMetrics />}

            {/* Cuerpo Principal del Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Columna Izquierda (Módulos Principales - 3/4 ancho en Desktop) */}
                <div className="lg:col-span-3 space-y-4">
                    {visibleMainModules.length > 0 && (
                        <>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-4 flex items-center gap-3">
                                Módulos Principales
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visibleMainModules.map((mod, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(mod.path)}
                                        className="group relative text-left bg-white rounded-[2rem] p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 border border-slate-100 overflow-hidden"
                                    >
                                        {/* Fondo interactivo al hover */}
                                        <div className={cn(
                                            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-0",
                                            mod.color
                                        )}></div>

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className={cn(
                                                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 shadow-sm",
                                                "bg-slate-50 text-slate-600",
                                                "group-hover:bg-white/20 group-hover:text-white group-hover:backdrop-blur-md group-hover:shadow-lg"
                                            )}>
                                                <mod.icon size={32} className="group-hover:scale-110 transition-transform" />
                                            </div>

                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 group-hover:text-white transition-colors duration-300">
                                                {mod.title}
                                            </h3>
                                            <p className="text-sm font-medium text-slate-500 group-hover:text-white/80 transition-colors duration-300">
                                                {mod.desc}
                                            </p>

                                            <div className="mt-8 flex justify-end">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:text-nominix-electric transition-colors duration-300">
                                                    <span className="font-bold text-lg leading-none transform translate-x-px group-hover:translate-x-1 transition-transform">→</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Módulos Secundarios (Grid Compacto) */}
                    {visibleSecondaryModules.length > 0 && (
                        <div className="space-y-4 pt-4 pb-12">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-4 flex items-center gap-3">
                                Administración & Reportes
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </h2>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {visibleSecondaryModules.map((mod, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(mod.path)}
                                        className="group flex flex-col items-center justify-center p-6 bg-white/60 hover:bg-white rounded-[1.5rem] border border-white/60 hover:border-slate-200 transition-all duration-300 hover:shadow-md text-center"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center mb-3 group-hover:bg-nominix-electric/10 group-hover:text-nominix-electric transition-colors duration-300">
                                            <mod.icon size={24} className="group-hover:scale-110 transition-transform" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-nominix-electric transition-colors">
                                            {mod.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Columna Derecha (Widgets Laterales - 1/4 ancho en Desktop) */}
                <div className="space-y-6">
                    {hasPermission('payroll_core.view_dashboard_tasks') && <PendingTasksWidget />}
                    {hasPermission('payroll_core.view_dashboard_events') && <UpcomingEventsWidget />}
                </div>

            </div> {/* Fin Cuerpo Principal GRID */}
        </div>
    );
};

export default HomeDashboard;
