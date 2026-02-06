# 🎨 Sistema de Diseño UI — Nominix

Documentación técnica de los componentes base utilizados en la plataforma. Todos los componentes residen en `src/components/ui/`.

---

## 📦 Componentes Base

### 🔘 Button
Botón versátil con soporte para estados de carga e iconos de `lucide-react`.
- **Props**: `variant`, `size`, `icon`, `iconPosition`, `loading`, `fullWidth`.
- **Variantes**: `primary`, `secondary`, `electric`, `danger`, `ghost`, `outline`, `link`.

### 📦 Card
Contenedor modular con subcomponentes vinculados mediante notación de punto.
- **Subcomponentes**:
  - `Card.Header`: Contenedor del título.
  - `Card.Title`: Título con peso fuente extra-black.
  - `Card.Description`: Subtítulo descriptivo.
  - `Card.Content`: Cuerpo principal.
  - `Card.Footer`: Pie con bordes y alineación derecha para botones.
  - `Card.Section`: Bloque con separador y título, ideal para formularios extensos (ej. `CompanyForm`).
- **Props**: `variant` (default, elevated, ghost, outline, muted, gradient), `size` (sm, md, lg, xl), `rounded` (sm, md, lg, xl), `hover` (boolean).

### 🪟 Modal & ConfirmModal
Sistemas de diálogo accesibles con `createPortal`.
- **Modal**: Props: `isOpen`, `onClose`, `title`, `description`, `size` (sm a full).
- **ConfirmModal**: Wrapper especializado para acciones de confirmación. Props: `onConfirm`, `message`, `variant` (primary, danger), `confirmText`.

### 📑 Tabs
Sistema de pestañas con renderizado perezoso (Lazy Rendering).
- **Estructura**: `Tabs` -> `TabsList` (Trigger) -> `TabsContent`.
- **Comportamiento**: `TabsContent` solo monta su hijo cuando la pestaña está activa, optimizando el rendimiento en formularios complejos.

### 👤 Avatar
Visualización de usuario con fallback automático de iniciales.
- **AvatarGroup**: Permite apilar avatares indicando el remanente (ej. +3).

---

## 📝 Campos de Formulario (RHF Compatible)
Todos estos componentes están envueltos en `forwardRef` para una integración nativa con `react-hook-form`.

### InputField
Entrada de texto estandarizada con label flotante y soporte de iconos.
- **Props**: `label`, `icon`, `error`, y todos los atributos nativos de `input`.

### SelectField
Selector desplegable con icono de flecha personalizado.
- **Props**: `label`, `options` (array de `{value, label}`), `placeholder`.

### ToggleField
Interruptor tipo switch basado en checkbox nativo.
- **Props**: `label`, `checked`, `onChange`.

---

## 🎨 Design Tokens
- **Font**: Inter (UI) / Outfit (Headers).
- **Radius**: Sistema de bordes suaves (`2rem` para tarjetas principales).
- **Animations**: Transiciones fluidas de `300ms` y efectos `backdrop-blur`.

---

© 2026 NÓMINIX - Design System Documentation.
