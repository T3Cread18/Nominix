import React, { Suspense } from 'react';
import { Building2, Store, Hash, Calculator, DollarSign, TrendingUp } from 'lucide-react';
import Tabs, { TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Skeleton from '../../components/ui/Skeleton';
import OrganizationManager from './OrganizationManager';

// Lazy loading de componentes pesados
const CompanyForm = React.lazy(() => import('./components/CompanyForm'));
const PayrollPoliciesForm = React.lazy(() => import('./components/PayrollPoliciesForm'));
const BranchManager = React.lazy(() => import('./components/BranchManager'));
const ExchangeRatesManager = React.lazy(() => import('./components/ExchangeRatesManager'));
const CompanySettings = () => {
    return (
        <div className="max-w-7xl mx-auto pb-10">
            <Suspense fallback={<div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div>}>
                <Tabs defaultValue="company" className="w-full">
                    <TabsList>
                        <TabsTrigger value="company" icon={Building2}>
                            Datos Empresa
                        </TabsTrigger>
                        <TabsTrigger value="policies" icon={Calculator}>
                            Políticas y Factores
                        </TabsTrigger>
                        <TabsTrigger value="branches" icon={Store}>
                            Sedes
                        </TabsTrigger>
                        <TabsTrigger value="organization" icon={Hash}>
                            Estructura Organizativa
                        </TabsTrigger>
                        <TabsTrigger value="rates" icon={TrendingUp}>
                            Tasas de Cambio
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="company">
                        <CompanyForm />
                    </TabsContent>

                    <TabsContent value="policies">
                        <PayrollPoliciesForm />
                    </TabsContent>

                    <TabsContent value="branches">
                        <BranchManager />
                    </TabsContent>

                    <TabsContent value="organization">
                        <OrganizationManager />
                    </TabsContent>
                    <TabsContent value="rates">
                        <ExchangeRatesManager />
                    </TabsContent>
                </Tabs>
            </Suspense>
        </div>
    );
};

export default CompanySettings;