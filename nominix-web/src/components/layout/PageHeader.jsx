import React from 'react';
import { cn } from '../../utils/cn';

/**
 * PageHeader - Encabezado de página con título y breadcrumb.
 * 
 * @example
 * <PageHeader 
 *   title="Dashboard de Nómina"
 *   subtitle="Procesamiento"
 *   actions={<Button>Nuevo Periodo</Button>}
 * />
 */
const PageHeader = ({
    title,
    subtitle,
    description,
    actions,
    backButton,
    className,
}) => {
    return (
        <div className={cn("mb-10", className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    {/* Botón de volver opcional */}
                    {backButton && (
                        <div className="mt-1">
                            {backButton}
                        </div>
                    )}

                    <div>
                        {/* Subtítulo / Breadcrumb */}
                        {subtitle && (
                            <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-[0.3em]">
                                {subtitle}
                            </p>
                        )}

                        {/* Título principal */}
                        <h1 className="text-4xl font-black text-nominix-dark flex items-center gap-4">
                            {title}
                        </h1>

                        {/* Descripción opcional */}
                        {description && (
                            <p className="mt-2 text-gray-500 max-w-2xl">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Acciones (botones, filtros, etc.) */}
                {actions && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Configuración de headers para cada ruta.
 * Permite definir título y subtítulo por path.
 */
const pageHeaders = {
    '/personnel': { title: 'Administración de Personal', subtitle: 'Gestión de RRHH' },
    '/payroll': { title: 'Dashboard de Nómina', subtitle: 'Procesamiento' },
    '/catalog': { title: 'Catálogo de Conceptos', subtitle: 'Configuración' },
    '/novelties': { title: 'Carga Masiva de Novedades', subtitle: 'Incidencias Laborales' },
    '/closures': { title: 'Cierre de Periodos', subtitle: 'Auditoría Legal' },
    '/config': { title: 'Datos de la Empresa', subtitle: 'Configuración' },
    '/loans': { title: 'Gestión de Préstamos', subtitle: 'Cuentas por Cobrar' },
    '/reports': { title: 'Reportes Gerenciales', subtitle: 'Análisis' },
};

/**
 * Obtiene la configuración del header basado en el path.
 */
const getPageHeader = (pathname) => {
    // Buscar coincidencia exacta primero
    if (pageHeaders[pathname]) {
        return pageHeaders[pathname];
    }

    // Buscar por prefijo (para rutas con parámetros)
    const matchingPath = Object.keys(pageHeaders).find(
        path => pathname.startsWith(path) && path !== '/'
    );

    return matchingPath ? pageHeaders[matchingPath] : null;
};

export default PageHeader;
export { PageHeader, pageHeaders, getPageHeader };
