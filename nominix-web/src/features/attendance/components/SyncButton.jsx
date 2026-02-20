import React, { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * SyncButton - Botón de sincronización global con toast de sonner.
 */
const SyncButton = ({ onSync, label = 'Sincronizar Todo', className = '' }) => {
    const [syncing, setSyncing] = useState(false);

    const handleClick = async () => {
        if (syncing) return;
        setSyncing(true);

        const toastId = toast.loading('Sincronizando todos los dispositivos...', {
            description: 'Esto puede tardar unos segundos dependiendo de la cantidad de dispositivos.',
        });

        try {
            const result = await onSync?.();
            const results = Array.isArray(result) ? result : [result];

            // Aggregate stats across all devices
            let totalNew = 0, totalDuplicates = 0, totalDownloaded = 0, totalErrors = 0;
            const deviceSummaries = [];

            for (const r of results) {
                if (!r) continue;
                const newE = r.new_events ?? 0;
                const dupE = r.duplicates ?? 0;
                const dlE = r.total_downloaded ?? 0;
                const errE = (r.errors || []).length;
                totalNew += newE;
                totalDuplicates += dupE;
                totalDownloaded += dlE;
                totalErrors += errE;

                if (newE > 0 || errE > 0) {
                    deviceSummaries.push(`${r.device || '?'}: ${newE} nuevos${errE > 0 ? ` (${errE} errores)` : ''}`);
                }
            }

            if (totalErrors > 0) {
                toast.warning('Sincronización completada con advertencias', {
                    id: toastId,
                    description: `📥 ${totalDownloaded} descargados · ✅ ${totalNew} nuevos · ⚠️ ${totalErrors} errores\n${deviceSummaries.join(' | ')}`,
                    duration: 10000,
                });
            } else if (totalNew === 0) {
                toast.info('Sin eventos nuevos', {
                    id: toastId,
                    description: `Se consultaron ${results.length} dispositivo(s). No se encontraron eventos nuevos.`,
                    duration: 5000,
                });
            } else {
                toast.success('Sincronización completada', {
                    id: toastId,
                    description: `📥 ${totalDownloaded} descargados · ✅ ${totalNew} nuevos · 🔄 ${totalDuplicates} duplicados`,
                    duration: 6000,
                });
            }
        } catch (err) {
            const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message;
            toast.error('Error al sincronizar', {
                id: toastId,
                description: errorMsg,
                duration: 8000,
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={syncing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${syncing
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 cursor-wait'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                } ${className}`}
        >
            {syncing
                ? <Loader2 size={14} className="animate-spin" />
                : <RefreshCw size={14} />
            }
            <span className="truncate max-w-[200px]">{syncing ? 'Sincronizando...' : label}</span>
        </button>
    );
};

export default SyncButton;
