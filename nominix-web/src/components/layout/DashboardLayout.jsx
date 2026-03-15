import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Navbar';
import { PageHeader, getPageHeader } from './PageHeader';
import { Toaster } from 'sonner';
import { Menu } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * DashboardLayout - Layout principal con sidebar lateral.
 *
 * Estructura:
 *   ┌─────────┬────────────────────────────────┐
 *   │         │  TopBar (mobile only)           │
 *   │ Sidebar ├────────────────────────────────┤
 *   │ (240px) │  <main> contenido de la ruta   │
 *   │         │                                │
 *   └─────────┴────────────────────────────────┘
 *
 * En mobile el sidebar es un drawer animado.
 * En desktop es estático y siempre visible.
 */
const DashboardLayout = ({
    showHeader = true,
    className,
}) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const location = useLocation();
    const headerConfig = getPageHeader(location.pathname);

    // Rutas que renderizan su propio header interno
    const noAutoHeaderRoutes = [
        '/personnel/create',
        '/personnel/',
    ];

    const shouldShowAutoHeader = showHeader &&
        headerConfig &&
        !noAutoHeaderRoutes.some(
            route => location.pathname.startsWith(route) && route !== '/personnel/'
        );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">

            {/* Skip to main content — Accesibilidad */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[110] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-nominix-electric focus:text-white focus:rounded-xl focus:text-sm focus:font-bold focus:shadow-lg"
            >
                Saltar al contenido principal
            </a>

            {/* Sidebar */}
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Área de contenido principal */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Top bar — solo en mobile, para el hamburger */}
                <header className="h-14 bg-white border-b border-gray-100 flex items-center gap-3 px-4 shrink-0 shadow-sm lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-nominix-electric/30"
                        aria-label="Abrir menú de navegación"
                    >
                        <Menu size={20} className="text-nominix-dark" />
                    </button>

                    {headerConfig && (
                        <p className="text-sm font-black text-nominix-dark truncate">
                            {headerConfig.title}
                        </p>
                    )}
                </header>

                {/* Contenido scrollable */}
                <main
                    id="main-content"
                    className={cn("flex-1 overflow-y-auto", className)}
                >
                    <div className="p-5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                        {shouldShowAutoHeader && (
                            <PageHeader
                                title={headerConfig.title}
                                subtitle={headerConfig.subtitle}
                            />
                        )}
                        <Outlet />
                    </div>
                </main>

            </div>

            <Toaster position="top-center" richColors />
        </div>
    );
};

/**
 * MinimalLayout - Layout sin sidebar para páginas de login/error.
 */
const MinimalLayout = ({ children }) => (
    <div className="min-h-screen bg-slate-50">
        {children || <Outlet />}
        <Toaster position="top-center" richColors />
    </div>
);

/**
 * TenantAdminLayout - Layout para el panel de administración de tenants.
 */
const TenantAdminLayout = () => (
    <div className="min-h-screen bg-[#0a0a0b]">
        <Outlet />
        <Toaster position="top-center" richColors theme="dark" />
    </div>
);

export default DashboardLayout;
export { DashboardLayout, MinimalLayout, TenantAdminLayout };
