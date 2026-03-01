import React from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './features/auth/LoginPage';
import { Loader2 } from 'lucide-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './context/ProtectedRoute';

// --- LAYOUTS ---
import { DashboardLayout, TenantAdminLayout } from './components/layout';

import PersonnelManager from './features/hr/PersonnelManager';
import EmployeeFormPage from './features/hr/EmployeeFormPage';
import EndowmentsManager from './features/hr/EndowmentsManager';
import ConceptCatalog from './features/payroll/ConceptCatalog';
import PayrollClosure from './features/payroll/PayrollClosure';
import NovedadesGrid from './features/payroll/NovedadesGrid';
import PayrollDashboard from './features/payroll/PayrollDashboard';
import CompanySettings from './features/settings/CompanySettings';
import RolesManager from './features/settings/RolesManager';
import LoanManager from './features/loans/LoanManager';
import TenantsLogin from './features/tenants/TenantsLogin';
import TenantsAdmin from './features/tenants/TenantsAdmin';
import VacationManager from './features/vacations/VacationManager';
import VacationSettings from './features/vacations/VacationSettings';
import { AttendanceDashboard } from './features/attendance';
import ImportWizard from './features/import/ImportWizard';
import DeclarationsPanel from './features/declarations/DeclarationsPanel';
import ReportsPanel from './features/reports/ReportsPanel';
import AuditLogsManager from './pages/AuditLogsManager';
import HomeDashboard from './pages/HomeDashboard';

/**
 * App - Componente principal de la aplicación.
 * 
 * Refactorizado para usar:
 * - DashboardLayout con React Router Outlet (elimina duplicación de nav/footer)
 * - Rutas anidadas para mejor organización
 * - Navbar y PageHeader extraídos a componentes reutilizables
 */
function App() {
    const { user, loading, tenant } = useAuth();
    const location = useLocation();

    const isTenantAdminPath = location.pathname.startsWith('/tenants');

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

    // Proteger contra acceso a apps de inquilino desde el dominio público
    const isPublicSchema = tenant?.schema_name === 'public';
    if (isPublicSchema && !isTenantAdminPath) {
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
                {/* Dashboard Principal (Portal) */}
                <Route index element={<HomeDashboard />} />

                {/* Módulo: Personal / RRHH */}
                <Route path="personnel" element={<ProtectedRoute permission="payroll_core.view_menu_personnel" fallbackPath="/"><PersonnelManager /></ProtectedRoute>} />
                <Route path="personnel/create" element={<ProtectedRoute permission="payroll_core.add_employee"><EmployeeFormPage /></ProtectedRoute>} />
                <Route path="personnel/endowments" element={<ProtectedRoute permission="payroll_core.view_endowmentevent"><EndowmentsManager /></ProtectedRoute>} />
                <Route path="personnel/:id" element={<ProtectedRoute permission="payroll_core.change_employee"><EmployeeFormPage /></ProtectedRoute>} />

                {/* Módulo: Nómina */}
                <Route path="payroll" element={<ProtectedRoute permission="payroll_core.view_payrollperiod"><PayrollDashboard /></ProtectedRoute>} />
                <Route path="catalog" element={<ProtectedRoute permission="payroll_core.view_payrollconcept"><ConceptCatalog /></ProtectedRoute>} />
                <Route path="novelties" element={<ProtectedRoute permission="payroll_core.view_payrollnovelty"><NovedadesGrid /></ProtectedRoute>} />
                <Route path="closures" element={<ProtectedRoute permission="payroll_core.add_payrollperiod"><PayrollClosure /></ProtectedRoute>} />

                {/* Módulo: Finanzas */}
                <Route path="loans" element={<ProtectedRoute permission="payroll_core.view_loan"><LoanManager /></ProtectedRoute>} />

                {/* Módulo: Configuración */}
                <Route path="config" element={<ProtectedRoute permission="payroll_core.view_company"><CompanySettings /></ProtectedRoute>} />
                <Route path="config/roles" element={<ProtectedRoute role="Administrador"><RolesManager /></ProtectedRoute>} />
                <Route path="audit-logs" element={<ProtectedRoute role="Administrador"><AuditLogsManager /></ProtectedRoute>} />

                {/* Módulo: Vacaciones */}
                <Route path="vacations" element={<ProtectedRoute permission="vacations.view_vacation"><VacationManager /></ProtectedRoute>} />
                <Route path="vacations/settings" element={<ProtectedRoute permission="vacations.change_vacationsettings"><VacationSettings /></ProtectedRoute>} />

                {/* Módulo: Asistencia */}
                <Route path="attendance" element={<ProtectedRoute permission="biometrics.view_attendanceevent"><AttendanceDashboard /></ProtectedRoute>} />

                {/* Módulo: Importación */}
                <Route path="import" element={<ProtectedRoute role="Administrador"><ImportWizard /></ProtectedRoute>} />

                {/* Módulo: Declaraciones Gubernamentales */}
                <Route path="declarations" element={<ProtectedRoute permission="declarations.view_declaration"><DeclarationsPanel /></ProtectedRoute>} />

                {/* Módulo: Reportes */}
                <Route path="reports" element={<ProtectedRoute permission="reports.view_report"><ReportsPanel /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export default App;