import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './features/auth/LoginPage';
import PayslipSimulator from './features/payroll/PayslipSimulator';
import PersonnelManager from './features/hr/PersonnelManager';
import ConceptCatalog from './features/payroll/ConceptCatalog';
import PayrollClosure from './features/payroll/PayrollClosure';
import NovedadesGrid from './features/payroll/NovedadesGrid';
import { LogOut, Loader2, Calculator, Users, ClipboardList, PieChart, Settings, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * App - Componente raíz con protección de rutas y navegación por módulos.
 */
function App() {
    const { user, logout, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('simulation'); // 'simulation', 'personnel', 'catalog', 'closures'

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-nominix-smoke">
                <Loader2 className="animate-spin text-nominix-electric" size={48} />
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    return (
        <div className="App min-h-screen bg-nominix-smoke/30">
            {/* Navegación Principal */}
            <nav className="bg-nominix-dark text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <h1 className="text-xl font-black italic tracking-tighter cursor-default">
                        NÓMINIX <span className="text-[10px] font-medium not-italic ml-2 opacity-50 uppercase tracking-widest">SaaS Edition</span>
                    </h1>

                    {/* Tabs de Navegación */}
                    <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('personnel')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                activeTab === 'personnel' ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <Users size={14} /> Personal
                        </button>
                        <button
                            onClick={() => setActiveTab('simulation')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                activeTab === 'simulation' ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <Calculator size={14} /> Nómina
                        </button>
                        <button
                            onClick={() => setActiveTab('catalog')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                activeTab === 'catalog' ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <ClipboardList size={14} /> Conceptos
                        </button>
                        <button
                            onClick={() => setActiveTab('novelties')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                activeTab === 'novelties' ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <FileSpreadsheet size={14} /> Novedades
                        </button>
                        <button
                            onClick={() => setActiveTab('closures')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                activeTab === 'closures' ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <ShieldCheck size={14} /> Cierres
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                        <span className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors"><PieChart size={12} /> Reportes</span>
                        <span className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors"><Settings size={12} /> Config</span>
                    </div>
                    <div className="w-px h-6 bg-white/10 hidden lg:block"></div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{user.first_name} {user.last_name}</p>
                            <p className="text-[9px] text-nominix-electric font-bold uppercase tracking-widest leading-none mt-1">Administrador</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all active:scale-95"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Contenido Principal */}
            <main className="py-10 max-w-7xl mx-auto px-4 lg:px-8">
                <div className="mb-10">
                    <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">
                        {activeTab === 'simulation' ? 'Gestión de Nómina' : activeTab === 'personnel' ? 'Gestión de RRHH' : activeTab === 'catalog' ? 'Maestros Especiales' : activeTab === 'novelties' ? 'Incidencias Laborales' : 'Auditoría Legal'}
                    </p>
                    <h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">
                        {activeTab === 'simulation' ? 'Calculadora de Recibos LOTTT' : activeTab === 'personnel' ? 'Administración de Personal' : activeTab === 'catalog' ? 'Catálogo de Conceptos' : activeTab === 'novelties' ? 'Carga Masiva de Novedades' : 'Cierre de Periodos'}
                        <span className="text-[10px] bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest font-black">
                            Tenant: GFO
                        </span>
                    </h2>
                </div>

                {activeTab === 'simulation' && <PayslipSimulator />}
                {activeTab === 'personnel' && <PersonnelManager />}
                {activeTab === 'catalog' && <ConceptCatalog />}
                {activeTab === 'closures' && <PayrollClosure />}
                {activeTab === 'novelties' && <NovedadesGrid />}
            </main>

            <footer className="py-10 text-center text-gray-400 text-[10px] uppercase font-bold border-t border-gray-100">
                &copy; 2025 NÓMINIX SaaS - Sistema Integral de Recursos Humanos para Venezuela
            </footer>
        </div>
    );
}

export default App;
