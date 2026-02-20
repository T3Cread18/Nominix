import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, LayoutDashboard, Wifi, Link2, CalendarDays, Calendar, List } from 'lucide-react';
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
import WeeklyAttendanceView from './WeeklyAttendanceView';
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
            // Get today's summary stats, recent events (limited to 20), and total mapping count
            const [summary, eventsData, mappingsData] = await Promise.all([
                attendanceService.getSummary(getTodayStr()).catch(() => ({})),
                attendanceService.getEvents({
                    page_size: 20,
                    date_from: getTodayStr(),
                    date_to: getTodayStr()
                }).catch(() => ({ results: [] })),
                attendanceService.getMappings({ page_size: 1 }).catch(() => ({ count: 0 })),
            ]);

            const totalEvents = summary.total_events || 0;
            const uniquePresent = summary.unique_employees || 0;

            // Handle mappings response (paginated or list)
            let totalMappings = 0;
            if (mappingsData.count !== undefined) {
                totalMappings = mappingsData.count;
            } else if (Array.isArray(mappingsData)) {
                totalMappings = mappingsData.length;
            } else if (mappingsData.results) {
                totalMappings = mappingsData.results.length;
            }

            setStats({
                totalEventsToday: totalEvents,
                presentToday: uniquePresent,
                absentToday: Math.max(0, totalMappings - uniquePresent),
                mappedEmployees: totalMappings,
            });

            // Handle events response
            const recent = eventsData.results || (Array.isArray(eventsData) ? eventsData : []);
            setRecentEvents(recent);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoadingDashboard(false);
        }
    }, [getTodayStr]);

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
        { value: 'daily', label: 'Diario', icon: CalendarDays },
        { value: 'weekly', label: 'Semanal', icon: Calendar },
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

                {/* Tab: Control Semanal */}
                <TabsContent value="weekly">
                    <div className="mt-4">
                        <WeeklyAttendanceView />
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
