import React, { useState } from 'react';
import { RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * SyncButton - Botón de sincronización con estados: idle, syncing, success, error.
 */
const SyncButton = ({ onSync, label = 'Sincronizar Todo', className = '' }) => {
    const [state, setState] = useState('idle'); // idle | syncing | success | error
    const [resultMsg, setResultMsg] = useState('');

    const handleClick = async () => {
        if (state === 'syncing') return;
        setState('syncing');
        setResultMsg('');
        try {
            const result = await onSync?.();
            setState('success');
            setResultMsg(result?.message || 'Sincronización completada');
        } catch (err) {
            setState('error');
            setResultMsg(err?.response?.data?.error || 'Error al sincronizar');
        } finally {
            setTimeout(() => {
                setState('idle');
                setResultMsg('');
            }, 4000);
        }
    };

    const stateConfig = {
        idle: {
            icon: RefreshCw,
            text: label,
            class: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20',
        },
        syncing: {
            icon: Loader2,
            text: 'Sincronizando...',
            class: 'bg-blue-500/10 text-blue-400 border-blue-500/20 cursor-wait',
        },
        success: {
            icon: CheckCircle,
            text: resultMsg || 'Completado',
            class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        },
        error: {
            icon: XCircle,
            text: resultMsg || 'Error',
            class: 'bg-red-500/10 text-red-400 border-red-500/20',
        },
    };

    const config = stateConfig[state];
    const Icon = config.icon;

    return (
        <button
            onClick={handleClick}
            disabled={state === 'syncing'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${config.class} ${className}`}
        >
            <Icon size={14} className={state === 'syncing' ? 'animate-spin' : ''} />
            <span className="truncate max-w-[200px]">{config.text}</span>
        </button>
    );
};

export default SyncButton;
