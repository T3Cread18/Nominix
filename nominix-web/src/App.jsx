import React from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './features/auth/LoginPage';
import { LogOut, Loader2, Calculator, Users, ClipboardList, Settings, ShieldCheck, FileSpreadsheet, PieChart } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster } from 'sonner';
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

// --- IMPORTACIÓN DE MÓDULOS ---

import PersonnelManager from './features/hr/PersonnelManager';
import EmployeeFormPage from './features/hr/EmployeeFormPage'; // <--- NUEVO COMPONENTE
import ConceptCatalog from './features/payroll/ConceptCatalog';
import PayrollClosure from './features/payroll/PayrollClosure';
import NovedadesGrid from './features/payroll/NovedadesGrid';
import PayrollDashboard from './features/payroll/PayrollDashboard';
import CompanySettings from './features/settings/CompanySettings';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function App() {
    const { user, logout, loading } = useAuth();
    const location = useLocation();

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

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <div className="App min-h-screen bg-nominix-smoke/30">
            {/* Navegación Principal */}
            <nav className="bg-nominix-dark text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <Link to="/" className="text-xl font-black italic tracking-tighter cursor-pointer hover:text-gray-200 transition-colors">
                        NÓMINIX <span className="text-[10px] font-medium not-italic ml-2 opacity-50 uppercase tracking-widest">SaaS Edition</span>
                    </Link>

                    {/* Tabs de Navegación */}
                    <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                        <Link to="/personnel" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", isActive('/personnel') ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white")}>
                            <Users size={14} /> Personal
                        </Link>
                        <Link to="/payroll" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", isActive('/payroll') ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white")}>
                            <Calculator size={14} /> Nómina
                        </Link>
                        <Link to="/catalog" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", isActive('/catalog') ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white")}>
                            <ClipboardList size={14} /> Conceptos
                        </Link>
                        <Link to="/novelties" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", isActive('/novelties') ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white")}>
                            <FileSpreadsheet size={14} /> Novedades
                        </Link>
                        <Link to="/closures" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", isActive('/closures') ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white")}>
                            <ShieldCheck size={14} /> Cierres
                        </Link>
                        <Link to="/config" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", isActive('/config') ? "bg-nominix-electric text-white" : "text-gray-400 hover:text-white")}>
                            <Settings size={14} /> Config
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                        <span className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors"><PieChart size={12} /> Reportes</span>
                    </div>
                    <div className="w-px h-6 bg-white/10 hidden lg:block"></div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{user.first_name} {user.last_name}</p>
                            <p className="text-[9px] text-nominix-electric font-bold uppercase tracking-widest leading-none mt-1">Administrador</p>
                        </div>
                        <button onClick={logout} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all active:scale-95" title="Cerrar Sesión">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Contenido Principal */}
            <main className="py-10 max-w-7xl mx-auto px-4 lg:px-8">

                {/* 1. HEADER DINÁMICO (Títulos grandes) */}
                <div className="mb-10">
                    <Routes>


                        <Route path="/" element={<><p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">Gestión de RRHH</p><h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">Administración de Personal</h2></>} />
                        <Route path="/payroll" element={<><p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">Procesamiento</p><h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">Dashboard de Nómina</h2></>} />

                        {/* PERSONAL: Lista Principal */}
                        <Route path="/personnel" element={<><p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">Gestión de RRHH</p><h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">Administración de Personal</h2></>} />


                        {/* PERSONAL: Formulario (Ocultamos el título grande porque el form tiene su propio header) */}
                        <Route path="/personnel/create" element={null} />
                        <Route path="/personnel/:id" element={null} />

                        <Route path="/catalog" element={<><p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">Maestros Especiales</p><h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">Catálogo de Conceptos</h2></>} />
                        <Route path="/novelties" element={<><p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">Incidencias Laborales</p><h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">Carga Masiva de Novedades</h2></>} />
                        <Route path="/closures" element={<><p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">Auditoría Legal</p><h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">Cierre de Periodos</h2></>} />
                        <Route path="/config" element={<><p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">Configuración</p><h2 className="text-4xl font-black text-nominix-dark flex items-center gap-4">Datos de la Empresa</h2></>} />
                    </Routes>
                </div>

                {/* 2. CONTENIDO (Componentes) */}
                <Routes>
                    <Route path="/" element={<PersonnelManager />} />
                    <Route path="/payroll" element={<PayrollDashboard />} />

                    {/* RUTAS DE PERSONAL REFACTORIZADAS */}
                    <Route path="/personnel" element={<PersonnelManager />} />
                    <Route path="/personnel/create" element={<EmployeeFormPage />} />
                    <Route path="/personnel/:id" element={<EmployeeFormPage />} />

                    <Route path="/catalog" element={<ConceptCatalog />} />
                    <Route path="/novelties" element={<NovedadesGrid />} />
                    <Route path="/closures" element={<PayrollClosure />} />
                    <Route path="/config" element={<CompanySettings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            <Toaster position="top-center" richColors />

            <footer className="py-10 text-center text-gray-400 text-[10px] uppercase font-bold border-t border-gray-100">
                &copy; 2025 NÓMINIX SaaS - Sistema Integral de Recursos Humanos para Venezuela
            </footer>
        </div>
    );
}

export default App;