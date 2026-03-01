import React, { useState } from 'react';
import {
    Building2, History, Calculator,
    Send, Plus, FileText, Download, Shield
} from 'lucide-react';
import Tabs, { TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import SocialBenefitsLedger from './SocialBenefitsLedger';
import AdvanceRequestModal from './AdvanceRequestModal';
import SettlementSimulator from './SettlementSimulator';
import RequirePermission from '../../context/RequirePermission';

const EMPTY_CONTRACTS = [];
const ManageSocialBenefits = ({ employeeId, employeeData, contracts = EMPTY_CONTRACTS }) => {
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

    // Buscar contrato activo en las dos fuentes posibles
    const activeContract = (Array.isArray(contracts) ? contracts : [])?.find(c => c.is_active) ||
        employeeData?.active_contract;

    const contractId = activeContract?.id;

    if (!contractId) {
        return (
            <div className="p-12 text-center bg-amber-50 rounded-[2rem] border border-amber-100">
                <Shield className="mx-auto text-amber-400 mb-4" size={48} />
                <h5 className="text-sm font-black text-amber-900 uppercase tracking-widest">Contrato Inactivo o No Encontrado</h5>
                <p className="text-[10px] font-bold text-amber-700 mt-1">
                    El trabajador debe tener un contrato activo para gestionar sus prestaciones sociales.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header de sección con acciones */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 italic tracking-tight">
                        Fideicomiso & Prestaciones
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        LOTTT Art. 142 - Liquidación y Garantías
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <RequirePermission permission="social_benefits.add_advancerequest">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={Send}
                            onClick={() => setIsAdvanceModalOpen(true)}
                        >
                            Solicitar Anticipo
                        </Button>
                    </RequirePermission>
                    <RequirePermission permission="social_benefits.view_socialbenefitcalculation">
                        <Button
                            variant="dark"
                            size="sm"
                            icon={Download}
                            disabled
                        >
                            Exportar Estado
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            <Tabs defaultValue="ledger" className="w-full">
                <TabsList className="mb-6 bg-gray-100/50 p-1 rounded-2xl w-full sm:w-auto">
                    <RequirePermission permission="social_benefits.view_socialbenefitcalculation">
                        <TabsTrigger value="ledger" icon={History} size="sm">Historial (Ledger)</TabsTrigger>
                    </RequirePermission>
                    <RequirePermission permission="social_benefits.view_socialbenefitcalculation">
                        <TabsTrigger value="simulator" icon={Calculator} size="sm">Simulador de Liquidación</TabsTrigger>
                    </RequirePermission>
                </TabsList>

                <RequirePermission permission="social_benefits.view_socialbenefitcalculation">
                    <TabsContent value="ledger">
                        <SocialBenefitsLedger
                            employeeId={employeeId}
                            contractId={contractId}
                        />
                    </TabsContent>
                </RequirePermission>

                <RequirePermission permission="social_benefits.view_socialbenefitcalculation">
                    <TabsContent value="simulator">
                        <SettlementSimulator
                            employeeId={employeeId}
                            contractId={contractId}
                            hireDate={activeContract?.hire_date}
                        />
                    </TabsContent>
                </RequirePermission>
            </Tabs>

            {/* Modales */}
            <AdvanceRequestModal
                isOpen={isAdvanceModalOpen}
                onClose={() => setIsAdvanceModalOpen(false)}
                employeeId={employeeId}
                contractId={contractId}
            />
        </div>
    );
};

export default ManageSocialBenefits;
