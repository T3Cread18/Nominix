# 🏗️ Sistema de Layout — Nominix

> Documentación de componentes de estructura y navegación.

---

## 📦 Instalación

```jsx
// Importar componentes de layout
import { 
    DashboardLayout, 
    MinimalLayout, 
    TenantAdminLayout,
    Navbar, 
    PageHeader 
} from './components/layout';
```

---

## 🖼️ DashboardLayout

Layout principal de la aplicación con Navbar, contenido y Footer.

**Usa React Router `<Outlet />` para renderizar rutas hijas.**

### En App.jsx (Router Config)
```jsx
import { DashboardLayout } from './components/layout';

function App() {
    return (
        <Routes>
            {/* Todas las rutas hijas aparecen dentro del layout */}
            <Route element={<DashboardLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/personnel" element={<PersonnelManager />} />
                <Route path="/payroll" element={<PayrollDashboard />} />
                <Route path="/config" element={<CompanySettings />} />
            </Route>
        </Routes>
    );
}
```

### Header Automático

El `PageHeader` se genera automáticamente basado en la ruta:

| Ruta | Título | Subtítulo |
|:-----|:-------|:----------|
| `/` | Administración de Personal | Gestión de RRHH |
| `/personnel` | Administración de Personal | Gestión de RRHH |
| `/payroll` | Dashboard de Nómina | Procesamiento |
| `/catalog` | Catálogo de Conceptos | Configuración |
| `/novelties` | Carga Masiva de Novedades | Incidencias Laborales |
| `/closures` | Cierre de Periodos | Auditoría Legal |
| `/config` | Datos de la Empresa | Configuración |
| `/loans` | Gestión de Préstamos | Cuentas por Cobrar |

### Props
| Prop | Tipo | Default | Descripción |
|:-----|:-----|:--------|:------------|
| `showHeader` | boolean | true | Mostrar header automático |
| `showFooter` | boolean | true | Mostrar footer |
| `maxWidth` | string | '7xl' | Ancho máximo del contenido |

---

## 🧭 Navbar

Barra de navegación superior.

```jsx
// Ya incluido en DashboardLayout, pero se puede usar standalone:
import { Navbar } from './components/layout';

<Navbar />
```

### Rutas de Navegación

Las rutas se definen como arrays para fácil modificación:

```jsx
// Editar en: src/components/layout/Navbar.jsx

const mainNavItems = [
    { path: '/personnel', icon: Users, label: 'Personal' },
    { path: '/payroll', icon: Calculator, label: 'Nómina' },
    { path: '/catalog', icon: ClipboardList, label: 'Conceptos' },
    // ... agregar más rutas
];

const secondaryNavItems = [
    { path: '/loans', icon: Banknote, label: 'Préstamos' },
    { path: '/reports', icon: PieChart, label: 'Reportes' },
];
```

---

## 📄 PageHeader

Encabezado de página con título, subtítulo y acciones.

### Uso Manual (cuando no se usa el automático)
```jsx
import { PageHeader } from './components/layout';
import { Button } from './components/ui';
import { Plus, ArrowLeft } from 'lucide-react';

<PageHeader
    title="Nuevo Empleado"
    subtitle="Registro de Personal"
    description="Complete la información del nuevo colaborador"
    backButton={
        <button onClick={() => navigate(-1)}>
            <ArrowLeft />
        </button>
    }
    actions={
        <Button icon={Plus}>Guardar</Button>
    }
/>
```

### Agregar Nuevas Rutas al Header Automático
```jsx
// Editar en: src/components/layout/PageHeader.jsx

const pageHeaders = {
    '/mi-nueva-ruta': { 
        title: 'Mi Nueva Página', 
        subtitle: 'Mi Módulo' 
    },
    // ...
};
```

---

## 🎭 Layouts Alternativos

### MinimalLayout (Sin Navbar)
Para páginas de login, error, etc.

```jsx
import { MinimalLayout } from './components/layout';

<Routes>
    <Route element={<MinimalLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/error" element={<ErrorPage />} />
    </Route>
</Routes>
```

### TenantAdminLayout (Tema Oscuro)
Para el panel de administración de tenants.

```jsx
import { TenantAdminLayout } from './components/layout';

<Routes>
    <Route element={<TenantAdminLayout />}>
        <Route path="/tenants" element={<TenantsLogin />} />
        <Route path="/tenants/admin" element={<TenantsAdmin />} />
    </Route>
</Routes>
```

---

## 📁 Estructura de Archivos

```
src/components/layout/
├── Navbar.jsx          # Barra de navegación
├── PageHeader.jsx      # Encabezado con título/acciones
├── DashboardLayout.jsx # Layout principal con Outlet
└── index.js            # Barrel export
```

---

## ✅ Beneficios de esta Arquitectura

| Antes | Después |
|:------|:--------|
| Navbar duplicado en cada página | Navbar único en Layout |
| Headers duplicados por ruta | Header automático desde config |
| Footer duplicado | Footer único en Layout |
| 165 líneas en App.jsx | 95 líneas en App.jsx |
| Difícil de mantener | Fácil de extender |

---

## 🔄 Migración desde Código Antiguo

### Antes (App.jsx original)
```jsx
// ❌ Código repetitivo
<nav>...</nav>  {/* ~50 líneas de navbar */}
<Routes>
    <Route path="/payroll" element={<div>Header...</div>} />
    {/* Headers duplicados */}
</Routes>
<Routes>
    <Route path="/payroll" element={<PayrollDashboard />} />
    {/* Contenido */}
</Routes>
<footer>...</footer>
```

### Después (App.jsx refactorizado)
```jsx
// ✅ Código limpio
<Routes>
    <Route element={<DashboardLayout />}>
        <Route path="/payroll" element={<PayrollDashboard />} />
        {/* Todo el layout es automático */}
    </Route>
</Routes>
```
