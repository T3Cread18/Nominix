import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import {
    LogOut, Loader2, Calculator, Users, ClipboardList,
    Settings, ShieldCheck, FileSpreadsheet, PieChart, Banknote, Calendar, Fingerprint, Shield,
    Menu, X
} from 'lucide-react';

import RequirePermission from '../../context/RequirePermission';

/**
 * Navbar - Barra de navegación principal de la aplicación.
 * 
 * Extraído de App.jsx para modularización.
 */
const Navbar = () => {
    const { user, tenant, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const location = useLocation();

    const isActive = (path) => location.pathname.startsWith(path);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    // Definición de las rutas de navegación
    const mainNavItems = [
        { path: '/personnel', icon: Users, label: 'Personal', perm: 'payroll_core.view_menu_personnel' },
        { path: '/payroll', icon: Calculator, label: 'Nómina', perm: 'payroll_core.view_menu_payroll' },
        { path: '/catalog', icon: ClipboardList, label: 'Conceptos', perm: 'payroll_core.view_menu_catalog' },
        { path: '/vacations', icon: Calendar, label: 'Vacaciones', perm: 'payroll_core.view_menu_vacations' },
        { path: '/attendance', icon: Fingerprint, label: 'Asistencia', perm: 'payroll_core.view_menu_attendance' },
        { path: '/config', icon: Settings, label: 'Config', perm: 'payroll_core.view_menu_config' },
        { path: '/audit-logs', icon: ShieldCheck, label: 'Bitácora', role: 'Administrador' },
    ];

    const secondaryNavItems = [
        { path: '/import', icon: FileSpreadsheet, label: 'Importar', perm: 'payroll_core.view_menu_import' },
        { path: '/loans', icon: Banknote, label: 'Préstamos', perm: 'payroll_core.view_menu_loans' },
        { path: '/declarations', icon: Shield, label: 'Ley y Gob', perm: 'payroll_core.view_menu_declarations' },
        { path: '/reports', icon: PieChart, label: 'Reportes', perm: 'payroll_core.view_menu_reports' },
    ];

    return (
        <>
            <nav className="bg-nominix-dark/95 backdrop-blur-md text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-[100] border-b border-white/5">
                {/* Logo y navegación principal */}
                <div className="flex items-center gap-4 lg:gap-8">
                    {/* Hamburger (Mobile Only) */}
                    <button
                        onClick={toggleMenu}
                        className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Menu"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <Link
                        to="/"
                        onClick={closeMenu}
                        className="text-xl font-black italic tracking-tighter cursor-pointer hover:text-gray-200 transition-colors flex items-center"
                    >
                        NÓMINIX{' '}
                        <span className="hidden xs:inline text-[10px] font-medium not-italic ml-2 opacity-50 uppercase tracking-widest">
                            SaaS
                        </span>
                    </Link>

                    {/* Tabs de Navegación Principal (Desktop) */}
                    <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                        {mainNavItems.map((item) => (
                            <RequirePermission key={item.path} permission={item.perm} role={item.role}>
                                <NavLink
                                    to={item.path}
                                    icon={item.icon}
                                    isActive={isActive(item.path)}
                                >
                                    {item.label}
                                </NavLink>
                            </RequirePermission>
                        ))}
                    </div>
                </div>

                {/* Sección derecha: módulos secundarios y usuario */}
                <div className="flex items-center gap-4 lg:gap-6">
                    {/* Navegación secundaria (Desktop Large Only) */}
                    <div className="hidden xl:flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                        {secondaryNavItems.map((item) => (
                            <RequirePermission key={item.path} permission={item.perm} role={item.role}>
                                <Link
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-3 cursor-pointer transition-colors",
                                        isActive(item.path) ? "text-nominix-electric" : "hover:text-white"
                                    )}
                                >
                                    <item.icon size={12} />
                                    {item.label}
                                </Link>
                            </RequirePermission>
                        ))}
                    </div>

                    {/* Separador */}
                    <div className="w-px h-6 bg-white/10 hidden xl:block" />

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

            {/* Mobile Menu Overlay */}
            {isMenuOpen && createPortal(
                <div className="fixed inset-0 top-[73px] bg-nominix-dark z-[999] md:hidden overflow-y-auto animate-fade-in">
                    <div className="flex flex-col p-6 gap-6">
                        {/* Main Items */}
                        <div className="grid grid-cols-1 gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Principal</p>
                            {mainNavItems.map((item) => (
                                <RequirePermission key={item.path} permission={item.perm} role={item.role}>
                                    <Link
                                        to={item.path}
                                        onClick={closeMenu}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-all",
                                            isActive(item.path)
                                                ? "bg-nominix-electric text-white shadow-lg shadow-nominix-electric/20"
                                                : "bg-white/5 text-gray-400"
                                        )}
                                    >
                                        <item.icon size={20} />
                                        {item.label}
                                    </Link>
                                </RequirePermission>
                            ))}
                        </div>

                        {/* Secondary Items */}
                        <div className="grid grid-cols-2 gap-3">
                            <p className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 mt-4">Gestión & Ajustes</p>
                            {secondaryNavItems.map((item) => (
                                <RequirePermission key={item.path} permission={item.perm} role={item.role}>
                                    <Link
                                        to={item.path}
                                        onClick={closeMenu}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-3 p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center transition-all",
                                            isActive(item.path)
                                                ? "bg-nominix-electric/10 text-nominix-electric border border-nominix-electric/20"
                                                : "bg-white/5 text-gray-400 border border-transparent"
                                        )}
                                    >
                                        <item.icon size={18} />
                                        {item.label}
                                    </Link>
                                </RequirePermission>
                            ))}
                        </div>

                        {/* Mobile User Profile */}
                        <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/5 sm:hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-nominix-electric flex items-center justify-center font-black text-xl">
                                    {user?.first_name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-white">{user?.first_name} {user?.last_name}</p>
                                    <p className="text-[10px] text-nominix-electric font-bold uppercase tracking-widest">{user?.is_superuser ? 'Administrador' : 'Usuario'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
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
