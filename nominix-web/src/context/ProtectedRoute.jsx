import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ShieldAlert } from 'lucide-react';

/**
 * ProtectedRoute - Envoltorio para rutas que requieren permisos específicos.
 * 
 * Uso en App.jsx:
 * <Route path="payroll" element={<ProtectedRoute permission="payroll_core.view_payrollperiod"><PayrollDashboard /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ permission, role, children, fallbackPath = '/' }) => {
    const { hasPermission, hasRole, loading, user } = useAuth();
    const location = useLocation();

    // Mientras AuthContext verifica el token y carga permisos
    if (loading) {
        return (
            <div className="flex animate-pulse flex-col items-center justify-center p-12 text-center h-[calc(100vh-80px)]">
                <div className="w-16 h-16 bg-white/5 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-white/10 rounded"></div>
            </div>
        );
    }

    if (!user) {
        // Redirigir al login si pierde sesión mientras navega a una ruta protegida
        return <Navigate to="/tenants" state={{ from: location }} replace />;
    }

    // Superusuarios siempre tienen acceso
    if (user.is_superuser) {
        return <>{children}</>;
    }

    let isAuthorized = false;

    // Verificar permiso si se provee
    if (permission && hasPermission(permission)) {
        isAuthorized = true;
    }

    // Verificar rol si se provee
    if (role && hasRole(role)) {
        isAuthorized = true;
    }

    // Si la ruta requiere autorización pero el usuario no la tiene
    if ((permission || role) && !isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-500/5">
                    <ShieldAlert size={40} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Acceso Denegado</h2>
                <p className="text-gray-400 max-w-sm mb-8 text-sm leading-relaxed">
                    No tienes los permisos necesarios para acceder a esta sección de {permission || role}.
                    Contacta al administrador del sistema si crees que esto es un error.
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/5"
                >
                    Volver Atrás
                </button>
            </div>
        );
    }

    // Si está autorizado o la ruta no requiere protección específica (error uso)
    return <>{children}</>;
};

export default ProtectedRoute;
