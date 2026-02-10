import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import {
    LogOut, Loader2, Calculator, Users, ClipboardList,
    Settings, ShieldCheck, FileSpreadsheet, PieChart, Banknote, Calendar, Fingerprint
} from 'lucide-react';

/**
 * Navbar - Barra de navegación principal de la aplicación.
 * 
 * Extraído de App.jsx para modularización.
 */
const Navbar = () => {
    const { user, tenant, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname.startsWith(path);

    // Definición de las rutas de navegación
    const mainNavItems = [
        { path: '/personnel', icon: Users, label: 'Personal' },
        { path: '/payroll', icon: Calculator, label: 'Nómina' },
        { path: '/catalog', icon: ClipboardList, label: 'Conceptos' },
        //{ path: '/novelties', icon: FileSpreadsheet, label: 'Novedades' },
        { path: '/closures', icon: ShieldCheck, label: 'Cierres' },
        { path: '/vacations', icon: Calendar, label: 'Vacaciones' },
        { path: '/attendance', icon: Fingerprint, label: 'Asistencia' },
        { path: '/config', icon: Settings, label: 'Config' },
    ];

    const secondaryNavItems = [
        { path: '/loans', icon: Banknote, label: 'Préstamos' },
        { path: '/reports', icon: PieChart, label: 'Reportes' },
    ];

    return (
        <nav className="bg-nominix-dark text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
            {/* Logo y navegación principal */}
            <div className="flex items-center gap-8">
                <Link
                    to="/"
                    className="text-xl font-black italic tracking-tighter cursor-pointer hover:text-gray-200 transition-colors"
                >
                    NÓMINIX{' '}
                    <span className="text-[10px] font-medium not-italic ml-2 opacity-50 uppercase tracking-widest">
                        SaaS Edition
                    </span>
                </Link>

                {/* Tabs de Navegación Principal */}
                <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                    {mainNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            icon={item.icon}
                            isActive={isActive(item.path)}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Sección derecha: módulos secundarios y usuario */}
            <div className="flex items-center gap-6">
                {/* Navegación secundaria */}
                <div className="hidden lg:flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                    {secondaryNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 cursor-pointer transition-colors",
                                isActive(item.path) ? "text-nominix-electric" : "hover:text-white"
                            )}
                        >
                            <item.icon size={12} />
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Separador */}
                <div className="w-px h-6 bg-white/10 hidden lg:block" />

                {/* Usuario y logout */}
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase tracking-tighter leading-none">
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-[9px] text-nominix-electric font-bold uppercase tracking-widest leading-none mt-1">
                            {user?.is_superuser ? 'Administrador' : 'Usuario'}
                        </p>
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
    );
};

/**
 * NavLink - Link individual de navegación.
 */
const NavLink = ({ to, icon: Icon, isActive, children }) => (
    <Link
        to={to}
        className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
            isActive
                ? "bg-nominix-electric text-white"
                : "text-gray-400 hover:text-white"
        )}
    >
        <Icon size={14} />
        {children}
    </Link>
);

export default Navbar;
export { Navbar, NavLink };
