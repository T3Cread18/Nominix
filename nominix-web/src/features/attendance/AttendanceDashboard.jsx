import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, LayoutDashboard, Wifi, Link2, CalendarDays, List } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui';
import { PageHeader } from '../../components/layout';
import attendanceService from '../../services/attendance.service';

// Vistas
import AttendanceLog from './AttendanceLog';
import DeviceManager from './DeviceManager';
import EmployeeMapping from './EmployeeMapping';
import AttendanceStats from './components/AttendanceStats';
import EventsTable from './components/EventsTable';
import DeviceEventsViewer from './DeviceEventsViewer';
import DailyAttendanceView from './DailyAttendanceView';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';

/**
 * AttendanceDashboard - Vista principal del módulo de Asistencia.
 * 
 * 3 tabs: Dashboard (resumen + eventos recientes), Dispositivos, Mapeo.
 */
const AttendanceDashboard = () => {
    const [activeTab, setActiveTab] = useState('daily');
    const [stats, setStats] = useState({});
    const [recentEvents, setRecentEvents] = useState([]);
    const [loadingDashboard, setLoadingDashboard] = useState(true);

    const loadDashboardData = useCallback(async () => {
        setLoadingDashboard(true);
        try {
            const [events, mappings] = await Promise.all([
                attendanceService.getEvents({
                    date_from: getTodayStr(),
                    date_to: getTodayStr(),
                }).catch(() => []),
                attendanceService.getMappings().catch(() => []),
            ]);

            const eventsList = Array.isArray(events) ? events : [];
            const mappingsList = Array.isArray(mappings) ? mappings : [];

            // Calcular KPIs
            const uniqueEmployees = new Set(eventsList.map(e => e.employee_device_id));
            const entryEvents = eventsList.filter(e => e.event_type === 'entry');
            const presentIds = new Set(entryEvents.map(e => e.employee_device_id));

            setStats({
                totalEventsToday: eventsList.length,
                presentToday: presentIds.size,
                absentToday: Math.max(0, mappingsList.length - presentIds.size),
                mappedEmployees: mappingsList.length,
            });

            // Últimos 20 eventos (más recientes primero)
            setRecentEvents(eventsList.slice(0, 20));
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoadingDashboard(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Refresh dashboard when switching to it
    useEffect(() => {
        if (activeTab === 'dashboard') {
            loadDashboardData();
        }
    }, [activeTab]);

    const tabs = [
        { value: 'daily', label: 'Control Diario', icon: CalendarDays },
        { value: 'log', label: 'Registro', icon: List },
        { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { value: 'devices', label: 'Dispositivos', icon: Wifi },
        { value: 'mapping', label: 'Mapeo', icon: Link2 },
        { value: 'device_events', label: 'Eventos (Raw)', icon: Fingerprint },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Asistencia"
                subtitle="Gestión de marcajes, dispositivos biométricos y mapeo de empleados"
                icon={Fingerprint}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            icon={tab.icon}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Tab: Control Diario */}
                <TabsContent value="daily">
                    <div className="mt-4">
                        <DailyAttendanceView />
                    </div>
                </TabsContent>

                {/* Tab: Registro de Marcajes (con paginación) */}
                <TabsContent value="log">
                    <div className="mt-4">
                        <AttendanceLog />
                    </div>
                </TabsContent>

                {/* Tab: Dashboard */}
                <TabsContent value="dashboard">
                    <div className="space-y-4 mt-4">
                        <AttendanceStats stats={stats} />

                        <Card className="border-0">
                            <CardHeader className="border-b border-white/5 pb-3">
                                <CardTitle className="text-sm">
                                    Marcajes de Hoy
                                    {!loadingDashboard && (
                                        <span className="ml-2 text-gray-400 font-normal">
                                            ({recentEvents.length} evento{recentEvents.length !== 1 ? 's' : ''})
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <EventsTable events={recentEvents} loading={loadingDashboard} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tab: Dispositivos */}
                <TabsContent value="devices">
                    <div className="mt-4">
                        <DeviceManager />
                    </div>
                </TabsContent>

                {/* Tab: Mapeo */}
                <TabsContent value="mapping">
                    <div className="mt-4">
                        <EmployeeMapping />
                    </div>
                </TabsContent>

                {/* Tab: Eventos del Dispositivo */}
                <TabsContent value="device_events">
                    <div className="mt-4">
                        <DeviceEventsViewer />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export default AttendanceDashboard;
