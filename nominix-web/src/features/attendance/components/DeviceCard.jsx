import React, { useState } from 'react';
import { Card, CardContent } from '../../../components/ui';
import { Wifi, WifiOff, AlertTriangle, MapPin, Clock, RefreshCw, Settings, Loader2, CheckCircle, XCircle, Users, CalendarClock } from 'lucide-react';

/**
 * DeviceCard - Tarjeta visual de un dispositivo biométrico.
 * 
 * Muestra: nombre, modelo, IP, estado, última sincronización.
 * Acciones: test conexión, sincronizar, editar, ver usuarios.
 */

const STATUS_CONFIG = {
    online: { icon: Wifi, label: 'En línea', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    offline: { icon: WifiOff, label: 'Fuera de línea', color: 'text-red-400', dot: 'bg-red-400' },
    error: { icon: AlertTriangle, label: 'Error', color: 'text-amber-400', dot: 'bg-amber-400' },
    unknown: { icon: WifiOff, label: 'Desconocido', color: 'text-gray-400', dot: 'bg-gray-400' },
};

const DeviceCard = ({ device, onTest, onSync, onCustomSync, onEdit, onViewUsers }) => {
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const status = STATUS_CONFIG[device.status] || STATUS_CONFIG.unknown;
    const StatusIcon = status.icon;

    const handleTest = async () => {
        if (!onTest || testing) return;
        setTesting(true);
        setTestResult(null);
        try {
            const result = await onTest(device.id);
            setTestResult({ success: true, message: result?.message || 'Conexión exitosa' });
        } catch (err) {
            setTestResult({ success: false, message: err?.response?.data?.error || 'Error de conexión' });
        } finally {
            setTesting(false);
            setTimeout(() => setTestResult(null), 5000);
        }
    };

    const handleSync = async () => {
        if (!onSync || syncing) return;
        setSyncing(true);
        try {
            await onSync(device.id);
        } catch (err) {
            console.error('Sync error:', err);
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
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                            {status.label}
                        </span>
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

                {/* Test Result */}
                {testResult && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium ${testResult.success
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                        }`}>
                        {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {testResult.message}
                    </div>
                )}

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
