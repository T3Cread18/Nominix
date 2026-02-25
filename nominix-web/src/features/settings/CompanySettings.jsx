import React, { Suspense } from 'react';
import { Building2, Store, Hash, Calculator, DollarSign, TrendingUp, ShieldCheck } from 'lucide-react';
import Tabs, { TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Skeleton from '../../components/ui/Skeleton';
import OrganizationManager from './OrganizationManager';
import RequirePermission from '../../context/RequirePermission';

// Lazy loading de componentes pesados
const CompanyForm = React.lazy(() => import('./components/CompanyForm'));
const PayrollPoliciesForm = React.lazy(() => import('./components/PayrollPoliciesForm'));
const BranchManager = React.lazy(() => import('./components/BranchManager'));
const ExchangeRatesManager = React.lazy(() => import('./components/ExchangeRatesManager'));
const RolesManager = React.lazy(() => import('./RolesManager'));
const CompanySettings = () => {
    return (
        <div className="max-w-7xl mx-auto pb-10">
            <Suspense fallback={<div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div>}>
                <Tabs defaultValue="company" className="w-full">
                    <TabsList>
                        <RequirePermission permission="payroll_core.view_company">
                            <TabsTrigger value="company" icon={Building2}>
                                Datos Empresa
                            </TabsTrigger>
                        </RequirePermission>
                        <RequirePermission permission="payroll_core.view_payrollpolicy">
                            <TabsTrigger value="policies" icon={Calculator}>
                                Políticas y Factores
                            </TabsTrigger>
                        </RequirePermission>
                        <RequirePermission permission="payroll_core.view_branch">
                            <TabsTrigger value="branches" icon={Store}>
                                Sedes
                            </TabsTrigger>
                        </RequirePermission>
                        <RequirePermission permission="payroll_core.view_department">
                            <TabsTrigger value="organization" icon={Hash}>
                                Estructura Organizativa
                            </TabsTrigger>
                        </RequirePermission>
                        <RequirePermission permission="payroll_core.view_exchangerate">
                            <TabsTrigger value="rates" icon={TrendingUp}>
                                Tasas de Cambio
                            </TabsTrigger>
                        </RequirePermission>
                        <RequirePermission permission="payroll_core.view_menu_roles" role="Administrador">
                            <TabsTrigger value="roles" icon={ShieldCheck}> Roles </TabsTrigger>
                        </RequirePermission>
                    </TabsList>

                    <RequirePermission permission="payroll_core.view_company">
                        <TabsContent value="company">
                            <CompanyForm />
                        </TabsContent>
                    </RequirePermission>

                    <RequirePermission permission="payroll_core.view_payrollpolicy">
                        <TabsContent value="policies">
                            <PayrollPoliciesForm />
                        </TabsContent>
                    </RequirePermission>

                    <RequirePermission permission="payroll_core.view_branch">
                        <TabsContent value="branches">
                            <BranchManager />
                        </TabsContent>
                    </RequirePermission>

                    <RequirePermission permission="payroll_core.view_department">
                        <TabsContent value="organization">
                            <OrganizationManager />
                        </TabsContent>
                    </RequirePermission>

                    <RequirePermission permission="payroll_core.view_exchangerate">
                        <TabsContent value="rates">
                            <ExchangeRatesManager />
                        </TabsContent>
                    </RequirePermission>
                    <RequirePermission permission="payroll_core.view_menu_roles" role="Administrador">
                        <TabsContent value="roles">
                            <RolesManager />
                        </TabsContent>
                    </RequirePermission>
                </Tabs>
            </Suspense>
        </div>
    );
};

export default CompanySettings;