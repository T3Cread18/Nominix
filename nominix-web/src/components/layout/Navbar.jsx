import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import {
    LogOut, Calculator, Users, ClipboardList,
    Settings, ShieldCheck, FileSpreadsheet, PieChart, Banknote, Calendar, Fingerprint, Shield,
    Home, X,
} from 'lucide-react';
import RequirePermission from '../../context/RequirePermission';

/**
 * Sidebar - Navegación lateral principal de la aplicación.
 *
 * Reemplaza el Navbar horizontal. Agrupa todos los módulos en
 * secciones con jerarquía clara. En mobile funciona como drawer.
 *
 * @param {boolean} open - Controla visibilidad en mobile
 * @param {function} onClose - Callback para cerrar el drawer en mobile
 */
const Sidebar = ({ open, onClose }) => {
    const { user, tenant, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    // ─── Grupos de navegación ───────────────────────────────────────
    const mainItems = [
        { path: '/', icon: Home, label: 'Inicio' },
        { path: '/personnel', icon: Users, label: 'Personal', perm: 'payroll_core.view_menu_personnel' },
        { path: '/payroll', icon: Calculator, label: 'Nómina', perm: 'payroll_core.view_menu_payroll' },
        { path: '/catalog', icon: ClipboardList, label: 'Conceptos', perm: 'payroll_core.view_menu_catalog' },
        { path: '/vacations', icon: Calendar, label: 'Vacaciones', perm: 'payroll_core.view_menu_vacations' },
        { path: '/attendance', icon: Fingerprint, label: 'Asistencia', perm: 'payroll_core.view_menu_attendance' },
    ];

    const managementItems = [
        { path: '/loans', icon: Banknote, label: 'Préstamos', perm: 'payroll_core.view_menu_loans' },
        { path: '/declarations', icon: Shield, label: 'Ley y Gobierno', perm: 'payroll_core.view_menu_declarations' },
        { path: '/reports', icon: PieChart, label: 'Reportes', perm: 'payroll_core.view_menu_reports' },
        { path: '/import', icon: FileSpreadsheet, label: 'Importar', perm: 'payroll_core.view_menu_import' },
    ];

    const systemItems = [
        { path: '/config', icon: Settings, label: 'Configuración', perm: 'payroll_core.view_menu_config' },
        { path: '/audit-logs', icon: ShieldCheck, label: 'Bitácora', role: 'Administrador' },
    ];

    // ─── Sub-componentes internos ────────────────────────────────────
    const SideLink = ({ item }) => (
        <Link
            to={item.path}
            onClick={onClose}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer group",
                "focus:outline-none focus:ring-2 focus:ring-nominix-electric/40 focus:ring-offset-1 focus:ring-offset-nominix-dark",
                isActive(item.path)
                    ? "bg-nominix-electric text-white shadow-lg shadow-nominix-electric/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
        >
            <item.icon
                size={17}
                className={cn(
                    "shrink-0 transition-transform duration-200",
                    !isActive(item.path) && "group-hover:scale-110"
                )}
            />
            <span className="truncate">{item.label}</span>
        </Link>
    );

    const NavGroup = ({ label, items }) => (
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-1.5 px-3">
                {label}
            </p>
            <div className="space-y-0.5">
                {items.map((item) => (
                    <RequirePermission key={item.path} permission={item.perm} role={item.role}>
                        <SideLink item={item} />
                    </RequirePermission>
                ))}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-[95] w-64 bg-nominix-dark flex flex-col",
                    "transition-transform duration-300 ease-in-out",
                    "lg:static lg:translate-x-0 lg:z-auto lg:shrink-0",
                    open ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full"
                )}
                aria-label="Navegación principal"
            >
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
                    <Link
                        to="/"
                        onClick={onClose}
                        className="group focus:outline-none focus:ring-2 focus:ring-nominix-electric/40 rounded-lg"
                    >
                        <p className="text-xl font-black italic tracking-tighter text-white group-hover:text-white/80 transition-colors">
                            NÓMINIX
                        </p>
                        {tenant?.schema_name && tenant.schema_name !== 'public' && (
                            <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest -mt-0.5 truncate max-w-[160px]">
                                {tenant.schema_name}
                            </p>
                        )}
                    </Link>

                    {/* Close button — mobile only */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-nominix-electric/40"
                        aria-label="Cerrar menú"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5" style={{ scrollbarWidth: 'none' }}>
                    <NavGroup label="Principal" items={mainItems} />
                    <NavGroup label="Gestión" items={managementItems} />
                    <NavGroup label="Sistema" items={systemItems} />
                </nav>

                {/* User profile */}
                <div className="shrink-0 px-3 pb-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-nominix-electric flex items-center justify-center font-black text-base text-white shrink-0 shadow-lg shadow-nominix-electric/20">
                            {user?.first_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate leading-tight">
                                {user?.first_name} {user?.last_name}
                            </p>
                            <p className="text-[9px] text-nominix-electric font-bold uppercase tracking-widest leading-tight mt-0.5">
                                {user?.is_superuser ? 'Administrador' : 'Usuario'}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/40"
                            title="Cerrar sesión"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
export { Sidebar };
