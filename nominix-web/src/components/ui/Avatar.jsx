import React from 'react';
import { cn } from '../../utils/cn';
import { User } from 'lucide-react';

/**
 * Tamaños de avatar.
 */
const avatarSizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
    "2xl": "w-24 h-24 text-3xl",
};

/**
 * Estilos de borde.
 */
const avatarRounded = {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
};

/**
 * Avatar - Componente de imagen de perfil con fallback a iniciales.
 * 
 * @example
 * <Avatar src="/user.jpg" name="Juan Pérez" size="lg" />
 * <Avatar name="María García" /> // Solo iniciales
 */
const Avatar = React.forwardRef(({
    src,
    name,
    alt,
    size = 'md',
    rounded = 'full',
    fallbackIcon: FallbackIcon = User,
    className,
    ...props
}, ref) => {
    // Generar iniciales del nombre
    const getInitials = (name) => {
        if (!name) return '';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const initials = getInitials(name);
    const [hasError, setHasError] = React.useState(false);

    const showImage = src && !hasError;
    const showInitials = !showImage && initials;
    const showIcon = !showImage && !initials;

    return (
        <div
            ref={ref}
            className={cn(
                // Base styles
                "relative flex items-center justify-center overflow-hidden bg-nominix-electric text-white font-black",
                // Size
                avatarSizes[size],
                // Rounded
                avatarRounded[rounded],
                // Custom
                className
            )}
            {...props}
        >
            {showImage && (
                <img
                    src={src}
                    alt={alt || name || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={() => setHasError(true)}
                />
            )}

            {showInitials && (
                <span className="select-none">{initials}</span>
            )}

            {showIcon && (
                <FallbackIcon
                    size={size === 'xs' ? 12 : size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 32}
                    className="opacity-60"
                />
            )}
        </div>
    );
});

Avatar.displayName = 'Avatar';

/**
 * AvatarGroup - Grupo de avatares apilados.
 * 
 * @example
 * <AvatarGroup max={3}>
 *   <Avatar name="Juan" />
 *   <Avatar name="María" />
 *   <Avatar name="Pedro" />
 *   <Avatar name="Ana" />
 * </AvatarGroup>
 */
const AvatarGroup = ({
    children,
    max = 4,
    size = 'md',
    className
}) => {
    const childrenArray = React.Children.toArray(children);
    const visibleChildren = childrenArray.slice(0, max);
    const remainingCount = childrenArray.length - max;

    return (
        <div className={cn("flex -space-x-2", className)}>
            {visibleChildren.map((child, index) => (
                <div
                    key={index}
                    className="relative ring-2 ring-white rounded-full"
                    style={{ zIndex: visibleChildren.length - index }}
                >
                    {React.cloneElement(child, { size })}
                </div>
            ))}
            {remainingCount > 0 && (
                <div
                    className={cn(
                        "relative flex items-center justify-center bg-gray-200 text-gray-600 font-black ring-2 ring-white",
                        avatarSizes[size],
                        "rounded-full"
                    )}
                    style={{ zIndex: 0 }}
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};

export default Avatar;
export { Avatar, AvatarGroup, avatarSizes };
