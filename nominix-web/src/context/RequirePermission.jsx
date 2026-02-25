import React from 'react';
import { useAuth } from './AuthContext';

/**
 * Componente Wrapper para renderizado condicional basado en permisos.
 * 
 * Uso:
 * <RequirePermission permission="payroll_core.add_employee" fallback={<p>Sin acceso</p>}>
 *    <BotonCrearEmpleado />
 * </RequirePermission>
 */
const RequirePermission = ({ permission, role, children, fallback = null }) => {
    const { hasPermission, hasRole, loading } = useAuth();

    if (loading) return null;

    let isAuthorized = false;

    if (permission && hasPermission(permission)) {
        isAuthorized = true;
    }

    if (role && hasRole(role)) {
        isAuthorized = true;
    }

    // Si no se especifica ni permiso ni rol (error de desarrollo), o si tiene acceso
    if ((!permission && !role) || isAuthorized) {
        return <>{children}</>;
    }

    return fallback;
};

export default RequirePermission;
