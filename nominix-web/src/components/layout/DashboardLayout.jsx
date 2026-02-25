import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { PageHeader, getPageHeader } from './PageHeader';
import { Toaster } from 'sonner';
import { cn } from '../../utils/cn';

/**
 * DashboardLayout - Layout principal de la aplicación.
 * 
 * Usa React Router Outlet para renderizar rutas hijas.
 * Esto evita duplicar la navegación y header en cada página.
 * 
 * @example
 * // En App.jsx o router config:
 * <Route element={<DashboardLayout />}>
 *   <Route path="/personnel" element={<PersonnelManager />} />
 *   <Route path="/payroll" element={<PayrollDashboard />} />
 * </Route>
 */
const DashboardLayout = ({
    showHeader = true,
    showFooter = true,
    maxWidth = '7xl',
    className
}) => {
    const location = useLocation();
    const headerConfig = getPageHeader(location.pathname);

    // Rutas donde no mostrar el header automático (tienen su propio header)
    const noAutoHeaderRoutes = [
        '/personnel/create',
        '/personnel/',  // Rutas con ID dinámico
    ];

    const shouldShowAutoHeader = showHeader &&
        headerConfig &&
        !noAutoHeaderRoutes.some(route => location.pathname.startsWith(route) && route !== '/personnel/');

    return (
        <div className="min-h-screen bg-nominix-smoke/30 flex flex-col">
            {/* Navbar */}
            <Navbar />

            {/* Contenido Principal */}
            <main className={cn(
                "flex-1 py-6 sm:py-10 mx-auto px-4 sm:px-6 lg:px-8 w-full",
                `max-w-${maxWidth}`,
                className
            )}>
                {/* Header automático basado en ruta */}
                {shouldShowAutoHeader && (
                    <PageHeader
                        title={headerConfig.title}
                        subtitle={headerConfig.subtitle}
                    />
                )}

                {/* Aquí se renderiza el componente de la ruta actual */}
                <Outlet />
            </main>

            {/* Footer */}
            {showFooter && (
                <footer className="py-10 text-center text-gray-400 text-[10px] uppercase font-bold border-t border-gray-100">
                    &copy; 2025 NÓMINIX SaaS - Sistema Integral de Recursos Humanos para Venezuela
                </footer>
            )}

            {/* Toaster para notificaciones */}
            <Toaster position="top-center" richColors />
        </div>
    );
};

/**
 * MinimalLayout - Layout sin navbar para páginas de login/error.
 */
const MinimalLayout = ({ children }) => (
    <div className="min-h-screen bg-nominix-smoke/30">
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
