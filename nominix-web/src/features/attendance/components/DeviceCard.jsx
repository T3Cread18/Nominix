import React, { useState } from 'react';
import { Card, CardContent } from '../../../components/ui';
import { Wifi, WifiOff, AlertTriangle, MapPin, Clock, RefreshCw, Settings, Loader2, CheckCircle, XCircle, Users, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DeviceCard - Tarjeta visual de un dispositivo biométrico.
 * 
 * Muestra: nombre, modelo, IP, estado, última sincronización.
 * Acciones: test conexión, sincronizar, editar, ver usuarios.
 */

const STATUS_CONFIG = {
    online: { icon: Wifi, label: 'EN LÍNEA', color: 'text-emerald-500', bgColor: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
    offline: { icon: WifiOff, label: 'OFFLINE', color: 'text-red-500', bgColor: 'bg-red-50 border-red-100', dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' },
    error: { icon: AlertTriangle, label: 'ERROR', color: 'text-amber-500', bgColor: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' },
    unknown: { icon: WifiOff, label: 'DESCONOCIDO', color: 'text-gray-500', bgColor: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
};

const DeviceCard = ({ device, onTest, onSync, onCustomSync, onEdit, onViewUsers }) => {
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const status = STATUS_CONFIG[device.status] || STATUS_CONFIG.unknown;
    const StatusIcon = status.icon;

    const handleTest = async () => {
        if (!onTest || testing) return;
        setTesting(true);
        try {
            const result = await onTest(device.id);
            toast.success(`${device.name}: Conexión exitosa`, {
                description: result?.device_info
                    ? `Modelo: ${result.device_info.model_name || 'N/A'} · S/N: ${result.device_info.serial_number || 'N/A'}`
                    : result?.message || 'Dispositivo respondió correctamente.',
            });
        } catch (err) {
            const errorData = err?.response?.data;
            const errorType = errorData?.error_type;
            const errorMsg = errorData?.message || errorData?.error || err.message;

            if (errorType === 'auth') {
                toast.error(`${device.name}: Autenticación fallida`, {
                    description: `Credenciales incorrectas o dispositivo bloqueado. ${errorMsg}`,
                });
            } else if (errorType === 'connection') {
                toast.error(`${device.name}: Sin conexión`, {
                    description: `No se puede alcanzar ${device.ip_address}:${device.port}. Verifica que el dispositivo esté encendido y accesible.`,
                });
            } else {
                toast.error(`${device.name}: Error de conexión`, {
                    description: errorMsg,
                });
            }
        } finally {
            setTesting(false);
        }
    };

    const handleSync = async () => {
        if (!onSync || syncing) return;
        setSyncing(true);

        const toastId = toast.loading(`Sincronizando ${device.name}...`, {
            description: `Descargando eventos desde ${device.ip_address}`,
        });

        try {
            const result = await onSync(device.id);

            // Parse sync result stats
            const stats = Array.isArray(result) ? result[0] : result;
            const newEvents = stats?.new_events ?? 0;
            const duplicates = stats?.duplicates ?? 0;
            const total = stats?.total_downloaded ?? 0;
            const mapped = stats?.mapped_to_employees ?? 0;
            const unmapped = stats?.unmapped ?? 0;
            const errors = stats?.errors || [];

            if (errors.length > 0) {
                toast.warning(`${device.name}: Sincronización con advertencias`, {
                    id: toastId,
                    description: `${newEvents} nuevos, ${duplicates} duplicados. ⚠️ ${errors[0]}`,
                    duration: 8000,
                });
            } else if (newEvents === 0 && total === 0) {
                toast.info(`${device.name}: Sin eventos nuevos`, {
                    id: toastId,
                    description: 'No se encontraron eventos en el rango de fechas consultado.',
                    duration: 5000,
                });
            } else {
                toast.success(`${device.name}: Sincronización completada`, {
                    id: toastId,
                    description: `📥 ${total} descargados · ✅ ${newEvents} nuevos · 🔄 ${duplicates} duplicados${unmapped > 0 ? ` · ⚠️ ${unmapped} sin mapear` : ''}`,
                    duration: 6000,
                });
            }
        } catch (err) {
            const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message;
            toast.error(`${device.name}: Error al sincronizar`, {
                id: toastId,
                description: errorMsg,
                duration: 8000,
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Card className="border-0 hover:ring-1 hover:ring-white/10 transition-all group">
            <CardContent className="p-5">
                {/* Header: Nombre + Estado */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold tracking-tight truncate">
                            {device.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {device.model_name || device.device_type_display || 'Hikvision'}
                        </p>
                    </div>
                    <div className="relative group/status flex items-center justify-end">
                        <div className={`flex items-center justify-center min-w-[100px] h-[26px] gap-2 px-3 rounded-lg border shadow-sm transition-all duration-300 ${status.color} ${status.bgColor} ${status.borderColor}`}>
                            <span className={`w-2 h-2 rounded-full ${status.dot} ${device.status === 'online' ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-white font-bold tracking-widest leading-none mt-px">
                                {status.label}
                            </span>
                        </div>
                        {device.status === 'error' && device.last_error_message && (
                            <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-xl bg-red-950/90 border border-red-900/50 shadow-xl opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-50 pointer-events-none break-words">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-medium text-red-200 leading-relaxed">
                                        {device.last_error_message}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Wifi size={12} className="shrink-0" />
                        <span className="text-xs font-mono truncate">{device.ip_address}:{device.port}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <MapPin size={12} className="shrink-0" />
                        <span className="text-xs truncate">{device.location || 'Sin ubicación'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={12} className="shrink-0" />
                        <span className="text-xs truncate">
                            {device.last_sync ? formatRelativeTime(device.last_sync) : 'Nunca sincronizado'}
                        </span>
                    </div>
                    {device.serial_number && (
                        <div className="flex items-center gap-2 text-gray-400">
                            <Settings size={12} className="shrink-0" />
                            <span className="text-xs font-mono truncate">{device.serial_number}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                        onClick={handleTest}
                        disabled={testing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-300 transition-all disabled:opacity-50"
                        title="Probar conexión"
                    >
                        {testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                        Test
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-[10px] font-bold uppercase tracking-wider text-blue-400 transition-all disabled:opacity-50"
                        title="Sincronizar eventos"
                    >
                        {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Sync
                    </button>
                    <button
                        onClick={() => onCustomSync?.(device)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                        title="Sincronizar desde fecha específica"
                    >
                        <CalendarClock size={12} />
                    </button>
                    <button
                        onClick={() => onViewUsers?.(device)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-300 transition-all"
                        title="Ver usuarios del dispositivo"
                    >
                        <Users size={12} />
                        Usuarios
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={() => onEdit?.(device)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all opacity-0 group-hover:opacity-100"
                        title="Editar dispositivo"
                    >
                        <Settings size={14} />
                    </button>
                </div>
            </CardContent>
        </Card>
    );
};

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Justo ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHrs < 24) return `Hace ${diffHrs}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
    } catch {
        return dateStr;
    }
}

export default DeviceCard;
