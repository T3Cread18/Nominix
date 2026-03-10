import React, { useState, useEffect, useCallback } from 'react';
import {
    Package, Warehouse, ArrowRightLeft, TrendingDown,
    Camera, BarChart3, Plus, ClipboardList
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui';
import { PageHeader } from '../../components/layout';
import assetsService from '../../services/assets.service';

// Vistas
import AssetListView from './views/AssetListView';
import WarehouseView from './views/WarehouseView';
import MovementListView from './views/MovementListView';
import ValuationView from './views/ValuationView';
import AssetCaptureView from './views/AssetCaptureView';
import AuditView from './views/AuditView';

/**
 * AssetsModule - Vista principal del módulo de Activos Fijos.
 */
const AssetsModule = () => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    const loadSummary = useCallback(async () => {
        setLoading(true);
        try {
            const [data, cats, whs] = await Promise.all([
                assetsService.getAssetSummary(),
                assetsService.getCategories(),
                assetsService.getWarehouses(),
            ]);
            setSummary(data);
            setCategories(cats);
            setWarehouses(whs);
        } catch (err) {
            console.error('Error loading summary:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    return (
        <div className="min-h-screen bg-gray-50">
            <PageHeader
                title="Activos Fijos"
                subtitle="Gestión de mobiliario, equipos y patrimonio"
                icon={Package}
            />

            {/* KPI Cards */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KPICard
                        label="Total Activos"
                        value={summary?.total || 0}
                        icon={Package}
                        color="text-nominix-electric"
                        bgColor="bg-nominix-electric/10"
                    />
                    <KPICard
                        label="Activos"
                        value={summary?.active || 0}
                        icon={Package}
                        color="text-emerald-600"
                        bgColor="bg-emerald-50"
                    />
                    <KPICard
                        label="Valor Adquisición"
                        value={`$${(summary?.total_acquisition_cost || 0).toLocaleString('es', { minimumFractionDigits: 2 })}`}
                        icon={BarChart3}
                        color="text-blue-600"
                        bgColor="bg-blue-50"
                        small
                    />
                    <KPICard
                        label="Valor en Libros"
                        value={`$${(summary?.total_book_value || 0).toLocaleString('es', { minimumFractionDigits: 2 })}`}
                        icon={TrendingDown}
                        color="text-amber-600"
                        bgColor="bg-amber-50"
                        small
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 sm:px-6 lg:px-8 pb-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-white border border-gray-200 rounded-xl p-1 mb-6 flex-wrap">
                        <TabsTrigger value="inventory" className="gap-2 text-xs sm:text-sm">
                            <Package size={14} /> Inventario
                        </TabsTrigger>
                        <TabsTrigger value="capture" className="gap-2 text-xs sm:text-sm">
                            <Camera size={14} /> Registro Rápido
                        </TabsTrigger>
                        <TabsTrigger value="warehouses" className="gap-2 text-xs sm:text-sm">
                            <Warehouse size={14} /> Almacenes
                        </TabsTrigger>
                        <TabsTrigger value="movements" className="gap-2 text-xs sm:text-sm">
                            <ArrowRightLeft size={14} /> Movimientos
                        </TabsTrigger>
                        <TabsTrigger value="valuation" className="gap-2 text-xs sm:text-sm">
                            <TrendingDown size={14} /> Avalúo
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="gap-2 text-xs sm:text-sm">
                            <ClipboardList size={14} /> Auditoría
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inventory">
                        <AssetListView onRefresh={loadSummary} />
                    </TabsContent>

                    <TabsContent value="capture">
                        <AssetCaptureView
                            categories={categories}
                            warehouses={warehouses}
                            onSaved={() => { loadSummary(); setActiveTab('inventory'); }}
                        />
                    </TabsContent>

                    <TabsContent value="warehouses">
                        <WarehouseView />
                    </TabsContent>

                    <TabsContent value="movements">
                        <MovementListView />
                    </TabsContent>

                    <TabsContent value="valuation">
                        <ValuationView />
                    </TabsContent>

                    <TabsContent value="audit">
                        <AuditView warehouses={warehouses} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

/**
 * KPICard - Tarjeta de métrica resumen.
 */
const KPICard = ({ label, value, icon: Icon, color, bgColor, small }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
            <div className={`${bgColor} ${color} p-2 rounded-lg`}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                <p className={`${small ? 'text-sm' : 'text-xl'} font-black text-nominix-dark`}>{value}</p>
            </div>
        </div>
    </div>
);

export default AssetsModule;
