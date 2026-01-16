import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * Context para compartir estado entre Tabs y sus hijos.
 */
const TabsContext = createContext(null);

/**
 * Hook para acceder al contexto de Tabs.
 */
const useTabsContext = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs compound components must be used within a Tabs component');
    }
    return context;
};

/**
 * Tabs - Contenedor principal de tabs.
 * 
 * @example
 * <Tabs defaultValue="profile">
 *   <TabsList>
 *     <TabsTrigger value="profile" icon={User}>Perfil</TabsTrigger>
 *     <TabsTrigger value="settings" icon={Settings}>Configuración</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="profile">
 *     <ProfileForm />
 *   </TabsContent>
 *   <TabsContent value="settings">
 *     <SettingsForm />
 *   </TabsContent>
 * </Tabs>
 */
const Tabs = ({
    children,
    defaultValue,
    value: controlledValue,
    onValueChange,
    className
}) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

    // Soportar modo controlado y no controlado
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const setValue = (newValue) => {
        if (!isControlled) {
            setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ value, setValue }}>
            <div className={className}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

/**
 * TabsList - Contenedor de los triggers/botones de tabs.
 */
const TabsList = ({ children, className }) => (
    <div
        role="tablist"
        className={cn(
            "flex gap-6 border-b border-gray-200 mb-8 overflow-x-auto",
            className
        )}
    >
        {children}
    </div>
);

/**
 * TabsTrigger - Botón individual de tab.
 */
const TabsTrigger = ({
    value,
    children,
    icon: Icon,
    disabled = false,
    className
}) => {
    const { value: activeValue, setValue } = useTabsContext();
    const isActive = activeValue === value;

    return (
        <button
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`tabpanel-${value}`}
            disabled={disabled}
            onClick={() => !disabled && setValue(value)}
            className={cn(
                "flex items-center gap-2 pb-3 border-b-2 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-nominix-electric/20",
                isActive
                    ? "border-nominix-electric text-nominix-electric"
                    : "border-transparent text-gray-400 hover:text-gray-600",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {Icon && <Icon size={16} />}
            {children}
        </button>
    );
};

/**
 * TabsContent - Panel de contenido de un tab.
 * Solo se renderiza cuando el tab está activo (lazy rendering).
 */
const TabsContent = ({
    value,
    children,
    forceMount = false,
    className
}) => {
    const { value: activeValue } = useTabsContext();
    const isActive = activeValue === value;

    // Si forceMount está activo, siempre renderiza pero oculta con CSS
    if (forceMount) {
        return (
            <div
                role="tabpanel"
                id={`tabpanel-${value}`}
                aria-labelledby={`tab-${value}`}
                hidden={!isActive}
                className={cn(
                    !isActive && "hidden",
                    isActive && "animate-in fade-in slide-in-from-bottom-2 duration-300",
                    className
                )}
            >
                {children}
            </div>
        );
    }

    // Por defecto, no renderiza el contenido si no está activo (lazy)
    if (!isActive) return null;

    return (
        <div
            role="tabpanel"
            id={`tabpanel-${value}`}
            aria-labelledby={`tab-${value}`}
            className={cn(
                "animate-in fade-in slide-in-from-bottom-2 duration-300",
                className
            )}
        >
            {children}
        </div>
    );
};

export default Tabs;
export { Tabs, TabsList, TabsTrigger, TabsContent };
