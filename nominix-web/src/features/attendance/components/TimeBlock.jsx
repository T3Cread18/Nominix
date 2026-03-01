import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2, XCircle, Edit3 } from 'lucide-react';
import { APP_CONFIG } from '../../../config';

/**
 * TimeBlock — Celda visual para un bloque de tiempo.
 * Colores Nominix: #1A2B48 (dark), #0052FF (electric), #F8F9FA (smoke), #FFF (surface).
 */
const TimeBlock = ({ block, label, expectedTime, onCorrect }) => {
    const [hover, setHover] = useState(false);

    if (!block) return null;

    const { status, time, diff_minutes } = block;

    const statusConfig = {
        success: {
            bg: '#ecfdf5',       // emerald-50
            border: '#a7f3d0',   // emerald-200
            text: '#059669',     // emerald-600
            icon: CheckCircle2,
        },
        warning: {
            bg: '#fffbeb',       // amber-50
            border: '#fde68a',   // amber-200
            text: '#d97706',     // amber-600
            icon: Clock,
        },
        danger: {
            bg: '#fef2f2',       // red-50
            border: '#fecaca',   // red-200
            text: '#dc2626',     // red-600
            icon: XCircle,
        },
        missing: {
            bg: '#f9fafb',       // gray-50
            border: '#e5e7eb',   // gray-200
            text: '#9ca3af',     // gray-400
            icon: AlertTriangle,
        },
    };

    const config = statusConfig[status] || statusConfig.missing;
    const StatusIcon = config.icon;

    // START NEW CONTENT
    const formatTime = (isoTime) => {
        if (!isoTime) return '--:--';
        try {
            const d = new Date(isoTime);
            const is12h = APP_CONFIG.TIME_FORMAT === '12h';

            return d.toLocaleTimeString('es-VE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: is12h
            });
        } catch {
            return '--:--';
        }
    };

    const formatDiff = (minutes) => {
        if (minutes === 0 || minutes === undefined) return null;
        const sign = minutes > 0 ? '+' : '';
        return `${sign}${minutes} min`;
    };

    const diffText = formatDiff(diff_minutes);
    const isMissing = status === 'missing';

    return (
        <div
            style={{
                background: config.bg,
                border: `1px solid ${config.border}`,
                borderRadius: '10px',
                padding: '10px 14px',
                minWidth: '120px',
                position: 'relative',
                cursor: isMissing ? 'pointer' : 'default',
                transition: 'background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={() => isMissing && onCorrect && onCorrect(block)}
        >
            {/* Label */}
            <div style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#9ca3af',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
            }}>
                <StatusIcon size={10} style={{ color: config.text }} />
                {label}
            </div>

            {/* Hora principal */}
            <div style={{
                fontSize: isMissing ? '14px' : '20px',
                fontWeight: 800,
                fontFamily: "'Inter', sans-serif",
                color: isMissing ? config.text : '#1A2B48',
                lineHeight: 1.1,
            }}>
                {isMissing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} />
                        Sin marca
                    </span>
                ) : formatTime(time)}
            </div>

            {/* Badge diferencial */}
            {diffText && !isMissing && (
                <div style={{
                    marginTop: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: config.text,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: `${config.bg}`,
                    border: `1px solid ${config.border}`,
                }}>
                    {diffText}
                </div>
            )}

            {/* Hora esperada */}
            {expectedTime && (
                <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '3px' }}>
                    Esperado: {expectedTime}
                </div>
            )}

            {/* Tooltip para missing */}
            {isMissing && hover && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    background: '#1A2B48',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '11px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    zIndex: 50,
                    boxShadow: '0 4px 16px rgba(26,43,72,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    <Edit3 size={12} />
                    Clic para justificar o corregir
                </div>
            )}
        </div>
    );
};

export default TimeBlock;
