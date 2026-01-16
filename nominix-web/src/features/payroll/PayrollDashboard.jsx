import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../../api/axiosClient';
import NovedadesGrid from './NovedadesGrid';
import PayrollClosure from './PayrollClosure';
import PayrollDetail from './PayrollDetail';
import {
    FileText,
    Calculator,
    Lock,
    Users,
    DollarSign,
    TrendingUp,
    Loader2,
    Calendar,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * PayrollDashboard - Dashboard unificado de gestión de nómina
 * Integra: Novedades, Simulación, Cierre de Periodos
 */
const PayrollDashboard = () => {
    const [activeTab, setActiveTab] = useState('detail');
    const [periods, setPeriods] = useState([]);
    const [employees, setEmployees] = useState([]); // <--- Lista completa compartida
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [stats, setStats] = useState({ employees: 0, openPeriods: 0, lastRate: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingRate, setLoadingRate] = useState(true);
    const [concepts, setConcepts] = useState([]);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (!hasLoaded.current) {
            loadInitialData();
            hasLoaded.current = true;
        }
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [periodsRes, employeesRes, conceptsRes] = await Promise.all([
                axiosClient.get('/payroll-periods/'),
                axiosClient.get('/employees/?is_active=true&page_size=1000'),
                axiosClient.get('/payroll-concepts/?active=true')
            ]);

            const periodsList = periodsRes.data.results || periodsRes.data;
            const employeesList = employeesRes.data.results || employeesRes.data; // <--- Guardar lista

            const openPeriods = periodsList.filter(p => p.status === 'OPEN');
            setPeriods(periodsList);
            setEmployees(employeesList);
            setConcepts(conceptsRes.data.results || conceptsRes.data);

            if (openPeriods.length > 0) {
                setSelectedPeriod(openPeriods[0]);
            }

            setStats(prev => ({
                ...prev,
                employees: employeesRes.data.count || employeesRes.data.length || 0,
                openPeriods: openPeriods.length
            }));

            // Cargar tasa BCV
            loadExchangeRate();

        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadExchangeRate = async () => {
        setLoadingRate(true);
        try {
            const res = await axiosClient.get('/exchange-rates/latest/?currency=USD');
            const rate = res.data.rate || res.data.value || 0;
            setStats(prev => ({ ...prev, lastRate: parseFloat(rate) }));
        } catch (error) {
            console.error("Error obteniendo tasa:", error);
        } finally {
            setLoadingRate(false);
        }
    };

    const tabs = [
        { id: 'detail', label: 'Detalle de Nómina', icon: Calculator, description: 'Modificar y previsualizar recibos' },
        { id: 'novelties', label: 'Novedades', icon: FileText, description: 'Carga masiva de incidencias' },
        { id: 'closure', label: 'Cierre', icon: Lock, description: 'Gestión de periodos' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-nominix-smoke flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin text-nominix-electric mx-auto mb-4" size={48} />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Cargando Panel de Nómina...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-nominix-smoke">
            {/* === HEADER === */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 lg:px-10">
                    <div className="flex items-center justify-between py-6">
                        <div>
                            <h1 className="text-2xl font-black text-nominix-dark flex items-center gap-3">
                                <div className="p-2 bg-nominix-electric/10 rounded-xl">
                                    <DollarSign className="text-nominix-electric" size={24} />
                                </div>
                                Gestión de Nómina
                            </h1>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-12">
                                Sistema Integral de Procesamiento
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Colaboradores</p>
                                <p className="text-lg font-black text-nominix-dark">{stats.employees}</p>
                            </div>
                            <div className="h-8 w-px bg-gray-100"></div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Periodos Abiertos</p>
                                <p className="text-lg font-black text-green-600">{stats.openPeriods}</p>
                            </div>
                            <div className="h-8 w-px bg-gray-100"></div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 justify-end">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Tasa BCV</p>
                                    <button
                                        onClick={loadExchangeRate}
                                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                        disabled={loadingRate}
                                    >
                                        <RefreshCw size={10} className={cn("text-gray-400", loadingRate && "animate-spin")} />
                                    </button>
                                </div>
                                <p className="text-lg font-black text-nominix-electric">
                                    {loadingRate ? '...' : `Bs. ${stats.lastRate.toFixed(2)}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* === TABS === */}
                    <div className="flex gap-1 -mb-px">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-4 border-b-2 transition-all",
                                    activeTab === tab.id
                                        ? "border-nominix-electric text-nominix-electric bg-nominix-electric/5"
                                        : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                <tab.icon size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* === PERIOD SELECTOR (Para Novedades y Detalle) === */}
            {(activeTab === 'novelties' || activeTab === 'detail') && selectedPeriod && (
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4">
                    <div className="bg-gradient-to-r from-nominix-dark to-slate-800 rounded-2xl p-5 flex items-center justify-between text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-xl">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Periodo Activo</p>
                                <h3 className="text-lg font-black">{selectedPeriod.name}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-white/60">{selectedPeriod.start_date}</span>
                            <ChevronRight size={14} className="text-white/40" />
                            <span className="text-white/60">{selectedPeriod.end_date}</span>
                            <span className="ml-4 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-[10px] font-black uppercase">
                                {selectedPeriod.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* === CONTENT === */}
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
                {activeTab === 'novelties' && (
                    <NovedadesGrid
                        initialPeriods={periods}
                        initialEmployees={employees}
                    />
                )}
                {activeTab === 'detail' && (
                    <PayrollDetail
                        period={selectedPeriod}
                        allEmployees={employees}
                        initialConcepts={concepts}
                    />
                )}
                {activeTab === 'closure' && (
                    <PayrollClosure
                        initialPeriods={periods}
                        onRefresh={loadInitialData}
                    />
                )}
            </div>
        </div>
    );
};

export default PayrollDashboard;
