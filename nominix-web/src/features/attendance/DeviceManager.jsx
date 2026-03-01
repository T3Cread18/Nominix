import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { Plus, RefreshCw } from 'lucide-react';
import attendanceService from '../../services/attendance.service';
import DeviceCard from './components/DeviceCard';
import DeviceFormModal from './components/DeviceFormModal';
import SyncButton from './components/SyncButton';
import SyncOptionsModal from './components/SyncOptionsModal';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DeviceManager - Gestión de dispositivos biométricos.
 * 
 * Grid de DeviceCards + botón agregar + sincronización global.
 */
const DeviceManager = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editDevice, setEditDevice] = useState(null);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncTargetDevice, setSyncTargetDevice] = useState(null);

    const loadDevices = useCallback(async () => {
        setLoading(true);
        try {
            const data = await attendanceService.getDevices();
            setDevices(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading devices:', err);
            toast.error('Error al cargar dispositivos', {
                description: err?.response?.data?.error || err.message,
            });
            setDevices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    const handleTest = async (deviceId) => {
        return await attendanceService.testConnection(deviceId);
    };

    const handleSync = async (deviceId) => {
        const result = await attendanceService.syncEvents(deviceId);
        // Reload devices to update last_sync
        loadDevices();
        return result;
    };

    const handleSyncAll = async () => {
        const result = await attendanceService.syncAll();
        loadDevices();
        return result;
    };

    const handleEdit = (device) => {
        setEditDevice(device);
        setShowForm(true);
    };

    const handleViewUsers = async (device) => {
        const toastId = toast.loading(`Consultando usuarios de "${device.name}"...`);
        try {
            const result = await attendanceService.getDeviceUsers(device.id);
            const users = result.users || result;
            const count = result.total || users.length;
            toast.success(`${device.name}: ${count} usuario(s) registrado(s)`, {
                id: toastId,
                description: users.length > 0
                    ? users.slice(0, 5).map(u => `${u.employee_no} - ${u.name || 'Sin nombre'}`).join(' · ') + (users.length > 5 ? ` ... y ${users.length - 5} más` : '')
                    : 'No se encontraron usuarios en este dispositivo.',
                duration: 8000,
            });
        } catch (err) {
            toast.error(`Error al obtener usuarios de "${device.name}"`, {
                id: toastId,
                description: err?.response?.data?.error || err.message,
            });
        }
    };

    const handleAdd = () => {
        setEditDevice(null);
        setShowForm(true);
    };

    const handleFormSaved = () => {
        loadDevices();
    };

    const handleCustomSyncRequest = (device = null) => {
        setSyncTargetDevice(device);
        setShowSyncModal(true);
    };

    const handleSyncConfirm = async (startTime) => {
        const deviceName = syncTargetDevice?.name || 'Todos los dispositivos';
        const toastId = toast.loading(`Sincronizando ${deviceName}...`, {
            description: startTime ? `Desde: ${startTime}` : 'Usando lógica automática (último evento).',
        });

        try {
            let result;
            if (syncTargetDevice) {
                result = await attendanceService.syncEvents(syncTargetDevice.id, { start_time: startTime });
            } else {
                result = await attendanceService.syncAll({ start_time: startTime });
            }

            const stats = Array.isArray(result) ? result[0] : result;
            const newEvents = stats?.new_events ?? 0;
            const totalDl = stats?.total_downloaded ?? 0;

            toast.success(`${deviceName}: Sincronización completada`, {
                id: toastId,
                description: `📥 ${totalDl} descargados · ✅ ${newEvents} nuevos`,
                duration: 6000,
            });
            loadDevices();
        } catch (err) {
            toast.error(`Error al sincronizar ${deviceName}`, {
                id: toastId,
                description: err.response?.data?.error || err.message,
                duration: 8000,
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <SyncButton onSync={handleSyncAll} label="Sincronizar Todo" />
                        <button
                            onClick={() => handleCustomSyncRequest(null)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all border border-blue-500/20"
                            title="Opciones de Sincronización (Fecha específica)"
                        >
                            <CalendarClock size={16} />
                        </button>
                    </div>
                    <button
                        onClick={loadDevices}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all"
                        title="Recargar lista"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                >
                    <Plus size={14} />
                    Agregar Dispositivo
                </button>
            </div>

            {/* Devices Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={`skeleton-${i}`} className="border-0">
                            <CardContent className="p-5">
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-4 bg-white/5 rounded w-2/3" />
                                    <div className="h-3 bg-white/5 rounded w-1/3" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-3 bg-white/5 rounded" />
                                        <div className="h-3 bg-white/5 rounded" />
                                    </div>
                                    <div className="h-8 bg-white/5 rounded mt-4" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : devices.length === 0 ? (
                <Card className="border-0">
                    <CardContent className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                            <Plus size={28} className="text-blue-400" />
                        </div>
                        <h3 className="text-sm font-bold mb-1">No hay dispositivos registrados</h3>
                        <p className="text-xs text-gray-400 mb-4">
                            Agrega tu primer dispositivo biométrico para comenzar a registrar asistencia
                        </p>
                        <button
                            onClick={handleAdd}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            <Plus size={14} />
                            Agregar Dispositivo
                        </button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {devices.map((device) => (
                        <DeviceCard
                            key={device.id}
                            device={device}
                            onTest={handleTest}
                            onSync={handleSync}
                            onCustomSync={handleCustomSyncRequest}
                            onEdit={handleEdit}
                            onViewUsers={handleViewUsers}
                        />
                    ))}
                </div>
            )}

            {/* Device form modal */}
            <DeviceFormModal
                isOpen={showForm}
                onClose={() => { setShowForm(false); setEditDevice(null); }}
                device={editDevice}
                onSaved={handleFormSaved}
            />

            {/* Sync options modal */}
            <SyncOptionsModal
                isOpen={showSyncModal}
                onClose={() => { setShowSyncModal(false); setSyncTargetDevice(null); }}
                onConfirm={handleSyncConfirm}
                title={syncTargetDevice ? `Sincronizar ${syncTargetDevice.name}` : "Sincronización Global Personalizada"}
            />
        </div>
    );
};

export default DeviceManager;
