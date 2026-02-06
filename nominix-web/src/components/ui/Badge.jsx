import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Variantes de color para badges.
 */
const badgeVariants = {
    default: "bg-gray-100 text-gray-700 border-gray-200",
    primary: "bg-nominix-electric/10 text-nominix-electric border-nominix-electric/20",
    success: "bg-green-50 text-green-600 border-green-200",
    warning: "bg-amber-50 text-amber-600 border-amber-200",
    danger: "bg-red-50 text-red-500 border-red-200",
    info: "bg-blue-50 text-blue-600 border-blue-200",
    outline: "bg-transparent text-gray-600 border-gray-300",
};

/**
 * Tamaños de badges.
 */
const badgeSizes = {
    xs: "px-1.5 py-0.5 text-[8px]",
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px]",
    lg: "px-3 py-1.5 text-xs",
};

/**
 * Badge - Etiqueta visual para estados, categorías, contadores.
 * 
 * @example
 * <Badge variant="success">Activo</Badge>
 * <Badge variant="danger" size="sm">Inactivo</Badge>
 * <Badge variant="primary" dot>Nuevo</Badge>
 */
const Badge = React.forwardRef(({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    icon: Icon,
    className,
    ...props
}, ref) => {
    return (
        <span
            ref={ref}
            className={cn(
                // Base styles
                "inline-flex items-center gap-1 font-black uppercase tracking-wide border rounded-full",
                // Variant
                badgeVariants[variant],
                // Size
                badgeSizes[size],
                // Custom
                className
            )}
            {...props}
        >
            {/* Dot indicator */}
            {dot && (
                <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    variant === 'success' && "bg-green-500",
                    variant === 'danger' && "bg-red-500",
                    variant === 'warning' && "bg-amber-500",
                    variant === 'primary' && "bg-nominix-electric",
                    variant === 'info' && "bg-blue-500",
                    (variant === 'default' || variant === 'outline') && "bg-gray-500",
                )} />
            )}

            {/* Icon */}
            {Icon && <Icon size={size === 'xs' ? 10 : size === 'sm' ? 12 : 14} />}

            {children}
        </span>
    );
});

Badge.displayName = 'Badge';

/**
 * StatusBadge - Badge preconfigurado para estados comunes.
 */
const StatusBadge = ({ status, className }) => {
    const statusConfig = {
        active: { variant: 'success', label: 'Activo', dot: true },
        inactive: { variant: 'danger', label: 'Inactivo', dot: true },
        pending: { variant: 'warning', label: 'Pendiente', dot: true },
        draft: { variant: 'default', label: 'Borrador' },
        paid: { variant: 'success', label: 'Pagado' },
        open: { variant: 'info', label: 'Abierto' },
        closed: { variant: 'default', label: 'Cerrado' },
    };

    const config = statusConfig[status] || { variant: 'default', label: status };

    return (
        <Badge
            variant={config.variant}
            dot={config.dot}
            className={className}
        >
            {config.label}
        </Badge>
    );
};

export default Badge;
export { Badge, StatusBadge, badgeVariants, badgeSizes };
