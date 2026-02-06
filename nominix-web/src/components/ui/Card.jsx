import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Variantes de estilo para las tarjetas.
 */
const cardVariants = {
    default: "bg-white border border-gray-100 shadow-sm",
    elevated: "bg-white shadow-xl shadow-slate-200/40 border border-slate-100",
    ghost: "bg-transparent",
    outline: "bg-transparent border-2 border-dashed border-gray-200",
    muted: "bg-gray-50 border border-gray-100",
    gradient: "bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-lg",
};

/**
 * Tamaños de padding para las tarjetas.
 */
const cardSizes = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    xl: "p-10",
};

/**
 * Estilos de bordes redondeados.
 */
const cardRounded = {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-[2rem]",
    xl: "rounded-[2.5rem]",
};

/**
 * Card - Contenedor visual reutilizable.
 * 
 * @example
 * <Card variant="elevated" size="lg">
 *   <CardHeader>
 *     <CardTitle>Título</CardTitle>
 *   </CardHeader>
 *   <CardContent>Contenido</CardContent>
 * </Card>
 */
const Card = React.forwardRef(({
    children,
    variant = 'default',
    size = 'md',
    rounded = 'lg',
    hover = false,
    className,
    ...props
}, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                // Base styles
                "relative overflow-hidden",
                // Variant
                cardVariants[variant],
                // Size (padding)
                cardSizes[size],
                // Rounded
                cardRounded[rounded],
                // Hover effect
                hover && "transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
                // Custom
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

/**
 * CardHeader - Encabezado de la tarjeta.
 */
const CardHeader = React.forwardRef(({ children, className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("mb-6", className)}
        {...props}
    >
        {children}
    </div>
));

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - Título de la tarjeta.
 */
const CardTitle = React.forwardRef(({ children, className, as: Component = 'h3', ...props }, ref) => (
    <Component
        ref={ref}
        className={cn(
            "text-lg font-black text-nominix-dark tracking-tight",
            className
        )}
        {...props}
    >
        {children}
    </Component>
));

CardTitle.displayName = 'CardTitle';

/**
 * CardDescription - Subtítulo de la tarjeta.
 */
const CardDescription = React.forwardRef(({ children, className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn(
            "text-sm text-gray-500 mt-1",
            className
        )}
        {...props}
    >
        {children}
    </p>
));

CardDescription.displayName = 'CardDescription';

/**
 * CardContent - Contenido principal de la tarjeta.
 */
const CardContent = React.forwardRef(({ children, className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(className)}
        {...props}
    >
        {children}
    </div>
));

CardContent.displayName = 'CardContent';

/**
 * CardFooter - Pie de la tarjeta.
 */
const CardFooter = React.forwardRef(({ children, className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "mt-6 pt-6 border-t border-gray-100 flex items-center justify-end gap-3",
            className
        )}
        {...props}
    >
        {children}
    </div>
));

CardFooter.displayName = 'CardFooter';

/**
 * CardSection - Sección con título dentro de una tarjeta.
 */
const CardSection = React.forwardRef(({ title, children, className, ...props }, ref) => (
    <section ref={ref} className={cn("mb-8 last:mb-0", className)} {...props}>
        {title && (
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-6 border-b border-gray-50 pb-4">
                {title}
            </h4>
        )}
        {children}
    </section>
));

CardSection.displayName = 'CardSection';

// Asignar subcomponentes al componente principal para permitir uso con notación de punto
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Section = CardSection;

export default Card;
export {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    CardSection,
    cardVariants,
    cardSizes
};
