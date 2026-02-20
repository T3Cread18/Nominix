import React from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './features/auth/LoginPage';
import { Loader2 } from 'lucide-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// --- LAYOUTS ---
import { DashboardLayout, TenantAdminLayout } from './components/layout';

// --- LANDING PAGE ---
import LandingPage from './features/landing/LandingPage';

// --- IMPORTACIÓN DE MÓDULOS (Páginas) ---
import PersonnelManager from './features/hr/PersonnelManager';
import EmployeeFormPage from './features/hr/EmployeeFormPage';
import ConceptCatalog from './features/payroll/ConceptCatalog';
import PayrollClosure from './features/payroll/PayrollClosure';
import NovedadesGrid from './features/payroll/NovedadesGrid';
import PayrollDashboard from './features/payroll/PayrollDashboard';
import CompanySettings from './features/settings/CompanySettings';
import LoanManager from './features/loans/LoanManager';
import TenantsLogin from './features/tenants/TenantsLogin';
import TenantsAdmin from './features/tenants/TenantsAdmin';
import VacationManager from './features/vacations/VacationManager';
import VacationSettings from './features/vacations/VacationSettings';
import { AttendanceDashboard } from './features/attendance';
import ImportWizard from './features/import/ImportWizard';

/**
 * App - Componente principal de la aplicación.
 * 
 * Implementa enrutamiento basado en dominios:
 * - Dominio raíz (localhost, nominix.net) -> Landing Page
 * - Subdominios (admin.*, tenant.*) -> Aplicación SaaS
 */
function App() {
    const { user, loading, tenant } = useAuth();
    const location = useLocation();

    const isTenantAdminPath = location.pathname.startsWith('/tenants');

    // Detectar dominio
    const hostname = window.location.hostname;
    // Lista de dominios que muestran la Landing Page
    const isLandingDomain =
        hostname === 'localhost' ||
        hostname === 'nominix.net' ||
        hostname === 'www.nominix.net';

    // Si estamos en el dominio principal y en la raíz, mostrar Landing Page
    // (Permitimos /tenants o rutas específicas si fuera necesario, pero por defecto Landing)
    if (isLandingDomain && !isTenantAdminPath && location.pathname === '/') {
        return <LandingPage />;
    }

    // --- LÓGICA DE APLICACIÓN SAAS (Subdominios) ---

    // Loading state
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-nominix-smoke">
                <Loader2 className="animate-spin text-nominix-electric" size={48} />
            </div>
        );
    }

    // Ruta especial de login para tenants (acceso público)
    if (location.pathname === '/tenants') {
        return <TenantsLogin />;
    }

    // Si no hay usuario, mostrar login
    if (!user) {
        return <LoginPage />;
    }

    // Proteger contra acceso a apps de inquilino desde el dominio público (si se coló)
    // Aunque ahora con la Landing Page esto es menos probable, mantenemos la seguridad
    const isPublicSchema = tenant?.schema_name === 'public';
    // Si es esquema público y NO es admin path, redirigir a selección de tenant o landing
    if (isPublicSchema && !isTenantAdminPath) {
        // Opción: Redirigir a landing si intenta entrar a app desde public
        if (isLandingDomain) return <LandingPage />;
        return <Navigate to="/tenants" replace />;
    }

    // Panel de administración de tenants (layout diferente)
    if (isTenantAdminPath) {
        return (
            <Routes>
                <Route element={<TenantAdminLayout />}>
                    <Route path="/tenants" element={<TenantsLogin />} />
                    <Route path="/tenants/admin" element={<TenantsAdmin />} />
                </Route>
            </Routes>
        );
    }

    // Rutas principales de la aplicación
    return (
        <Routes>
            {/* Layout principal del dashboard */}
            <Route element={<DashboardLayout />}>
                {/* Módulo: Personal / RRHH */}
                <Route index element={<PersonnelManager />} />
                <Route path="personnel" element={<PersonnelManager />} />
                <Route path="personnel/create" element={<EmployeeFormPage />} />
                <Route path="personnel/:id" element={<EmployeeFormPage />} />

                {/* Módulo: Nómina */}
                <Route path="payroll" element={<PayrollDashboard />} />
                <Route path="catalog" element={<ConceptCatalog />} />
                <Route path="novelties" element={<NovedadesGrid />} />
                <Route path="closures" element={<PayrollClosure />} />

                {/* Módulo: Finanzas */}
                <Route path="loans" element={<LoanManager />} />

                {/* Módulo: Configuración */}
                <Route path="config" element={<CompanySettings />} />

                {/* Módulo: Vacaciones */}
                <Route path="vacations" element={<VacationManager />} />
                <Route path="vacations/settings" element={<VacationSettings />} />

                {/* Módulo: Asistencia */}
                <Route path="attendance" element={<AttendanceDashboard />} />

                {/* Módulo: Importación */}
                <Route path="import" element={<ImportWizard />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export default App;