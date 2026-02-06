import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Skeleton - Placeholder animado para estados de carga.
 * 
 * @example
 * <Skeleton className="h-4 w-[200px]" />
 * <Skeleton className="h-12 w-12 rounded-full" />
 */
const Skeleton = ({ className, ...props }) => (
    <div
        className={cn(
            "animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
            "rounded-xl",
            className
        )}
        {...props}
    />
);

/**
 * SkeletonText - Línea de texto skeleton.
 */
const SkeletonText = ({ lines = 1, className }) => (
    <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className={cn(
                    "h-4",
                    i === lines - 1 ? "w-3/4" : "w-full"
                )}
            />
        ))}
    </div>
);

/**
 * SkeletonCard - Tarjeta skeleton completa.
 */
const SkeletonCard = ({ className }) => (
    <div className={cn(
        "bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-4",
        className
    )}>
        <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
            </div>
        </div>
        <SkeletonText lines={3} />
    </div>
);

/**
 * SkeletonTable - Tabla skeleton.
 */
const SkeletonTable = ({ rows = 5, columns = 4, className }) => (
    <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
            ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 p-4 border-b border-gray-50">
                {Array.from({ length: columns }).map((_, colIndex) => (
                    <Skeleton
                        key={colIndex}
                        className={cn(
                            "h-4 flex-1",
                            colIndex === 0 && "w-12 flex-none"
                        )}
                    />
                ))}
            </div>
        ))}
    </div>
);

/**
 * SkeletonForm - Formulario skeleton.
 */
const SkeletonForm = ({ fields = 4, columns = 2, className }) => (
    <div className={cn(
        "grid gap-6",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-3",
        className
    )}>
        {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-12 w-full" />
            </div>
        ))}
    </div>
);

/**
 * PageLoader - Loader de página completa.
 */
const PageLoader = ({ message = "Cargando..." }) => (
    <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-nominix-electric rounded-full animate-spin" />
        </div>
        <p className="mt-4 text-xs font-black uppercase text-gray-400 tracking-widest">
            {message}
        </p>
    </div>
);

export default Skeleton;
export {
    Skeleton,
    SkeletonText,
    SkeletonCard,
    SkeletonTable,
    SkeletonForm,
    PageLoader
};
