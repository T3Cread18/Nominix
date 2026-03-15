/**
 * Layout Components - Nominix
 *
 * Componentes de estructura y navegación.
 */

export { default as Sidebar } from './Navbar';
export { Sidebar as Navbar } from './Navbar'; // alias para compatibilidad

export { default as PageHeader } from './PageHeader';
export { PageHeader as PageHeaderComponent, pageHeaders, getPageHeader } from './PageHeader';

export { default as DashboardLayout } from './DashboardLayout';
export { DashboardLayout as DashboardLayoutComponent, MinimalLayout, TenantAdminLayout } from './DashboardLayout';
