import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

/**
 * Variantes de estilo para el botón.
 * Cada variante define colores, sombras y estados hover.
 */
const buttonVariants = {
    primary: "bg-nominix-dark text-white hover:bg-black shadow-lg shadow-nominix-dark/20",
    secondary: "bg-white text-nominix-dark border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
    ghost: "text-gray-600 hover:bg-gray-100",
    electric: "bg-nominix-electric text-white hover:opacity-90 shadow-lg shadow-nominix-electric/20",
    outline: "border-2 border-nominix-dark text-nominix-dark hover:bg-nominix-dark hover:text-white",
    link: "text-nominix-electric hover:underline underline-offset-4",
};

/**
 * Tamaños disponibles para el botón.
 */
const buttonSizes = {
    xs: "px-2.5 py-1.5 text-[9px] rounded-lg",
    sm: "px-3 py-2 text-[10px] rounded-xl",
    md: "px-5 py-2.5 text-xs rounded-xl",
    lg: "px-8 py-4 text-xs rounded-2xl",
    icon: "p-2.5 rounded-xl",
};

/**
 * Button - Componente de botón reutilizable con variantes.
 * 
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Guardar
 * </Button>
 * 
 * @example
 * <Button variant="danger" loading>
 *   Eliminando...
 * </Button>
 * 
 * @example
 * <Button variant="ghost" size="icon" icon={Settings}>
 *   {null}
 * </Button>
 */
const Button = React.forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    className,
    type = 'button',
    ...props
}, ref) => {
    const isDisabled = disabled || loading;
    const iconSize = size === 'xs' ? 12 : size === 'sm' ? 14 : 16;

    return (
        <button
            ref={ref}
            type={type}
            disabled={isDisabled}
            className={cn(
                // Base styles
                "inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-nominix-electric/20 focus:ring-offset-2",
                // Variant styles
                buttonVariants[variant],
                // Size styles
                buttonSizes[size],
                // Full width
                fullWidth && "w-full",
                // Custom classes
                className
            )}
            {...props}
        >
            {/* Loading spinner */}
            {loading && (
                <Loader2 className="animate-spin" size={iconSize} />
            )}

            {/* Left icon */}
            {!loading && Icon && iconPosition === 'left' && (
                <Icon size={iconSize} />
            )}

            {/* Content */}
            {children}

            {/* Right icon */}
            {!loading && Icon && iconPosition === 'right' && (
                <Icon size={iconSize} />
            )}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
export { Button, buttonVariants, buttonSizes };
