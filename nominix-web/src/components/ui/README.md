# 🎨 Sistema de Diseño UI — Nominix

> Documentación de componentes UI reutilizables.

---

## 📦 Instalación

```jsx
// Importar todos los componentes
import { 
    Button, Card, Modal, Tabs, Badge, Avatar, Skeleton,
    InputField, SelectField, ToggleField 
} from './components/ui';

// O importar individualmente
import Button from './components/ui/Button';
```

---

## 🔘 Button

Botón con múltiples variantes y estados.

### Variantes
```jsx
<Button variant="primary">Guardar</Button>    // Azul oscuro (default)
<Button variant="electric">Enviar</Button>    // Azul eléctrico
<Button variant="secondary">Cancelar</Button> // Blanco con borde
<Button variant="danger">Eliminar</Button>    // Rojo
<Button variant="ghost">Opcional</Button>     // Sin fondo
<Button variant="outline">Contorno</Button>   // Solo borde
<Button variant="link">Ver más</Button>       // Estilo link
```

### Tamaños
```jsx
<Button size="xs">Extra pequeño</Button>
<Button size="sm">Pequeño</Button>
<Button size="md">Mediano</Button>  // default
<Button size="lg">Grande</Button>
<Button size="icon"><Settings /></Button>  // Solo icono
```

### Con iconos y loading
```jsx
import { Save, Trash2 } from 'lucide-react';

<Button icon={Save}>Guardar</Button>
<Button icon={Trash2} iconPosition="right">Eliminar</Button>
<Button loading>Procesando...</Button>
<Button disabled>Deshabilitado</Button>
<Button fullWidth>Ancho completo</Button>
```

---

## 📦 Card

Contenedor visual con subcomponentes.

### Básico
```jsx
<Card>
    Contenido simple
</Card>
```

### Completo
```jsx
<Card variant="elevated" size="lg" rounded="xl">
    <CardHeader>
        <CardTitle>Título de la Tarjeta</CardTitle>
        <CardDescription>Descripción opcional</CardDescription>
    </CardHeader>
    <CardContent>
        <p>Contenido principal aquí...</p>
    </CardContent>
    <CardFooter>
        <Button variant="ghost">Cancelar</Button>
        <Button>Guardar</Button>
    </CardFooter>
</Card>
```

### Con secciones
```jsx
<Card>
    <CardSection title="Información Básica">
        <InputField label="Nombre" />
    </CardSection>
    <CardSection title="Datos de Contacto">
        <InputField label="Email" />
    </CardSection>
</Card>
```

### Variantes
| Variante | Descripción |
|:---------|:------------|
| `default` | Blanco con borde sutil |
| `elevated` | Sombra prominente |
| `ghost` | Transparente |
| `outline` | Borde punteado |
| `muted` | Fondo gris |
| `gradient` | Gradiente sutil |

---

## 🪟 Modal

Diálogo modal accesible.

### Básico
```jsx
const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>Abrir Modal</Button>

<Modal
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    title="Título del Modal"
    description="Descripción opcional"
    size="md"
>
    <p>Contenido del modal...</p>
    <ModalFooter>
        <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancelar
        </Button>
        <Button onClick={handleSave}>Guardar</Button>
    </ModalFooter>
</Modal>
```

### Modal de Confirmación
```jsx
<ConfirmModal
    isOpen={isConfirmOpen}
    onClose={() => setIsConfirmOpen(false)}
    onConfirm={handleDelete}
    title="¿Eliminar registro?"
    message="Esta acción no se puede deshacer."
    variant="danger"
    confirmText="Sí, eliminar"
    cancelText="Cancelar"
/>
```

### Props
| Prop | Tipo | Default | Descripción |
|:-----|:-----|:--------|:------------|
| `isOpen` | boolean | - | Controla visibilidad |
| `onClose` | function | - | Callback al cerrar |
| `title` | string | - | Título del modal |
| `size` | sm/md/lg/xl/2xl/3xl/full | md | Ancho máximo |
| `closeOnEscape` | boolean | true | Cerrar con ESC |
| `closeOnOverlayClick` | boolean | true | Cerrar al clickear fondo |

---

## 📑 Tabs

Sistema de pestañas con lazy rendering.

### Básico
```jsx
import { User, Settings, CreditCard } from 'lucide-react';

<Tabs defaultValue="profile">
    <TabsList>
        <TabsTrigger value="profile" icon={User}>Perfil</TabsTrigger>
        <TabsTrigger value="settings" icon={Settings}>Config</TabsTrigger>
        <TabsTrigger value="billing" icon={CreditCard}>Facturación</TabsTrigger>
    </TabsList>
    
    <TabsContent value="profile">
        <ProfileForm />  {/* Solo se monta cuando está activo */}
    </TabsContent>
    <TabsContent value="settings">
        <SettingsForm />
    </TabsContent>
    <TabsContent value="billing">
        <BillingInfo />
    </TabsContent>
</Tabs>
```

### Modo Controlado
```jsx
const [tab, setTab] = useState('profile');

<Tabs value={tab} onValueChange={setTab}>
    ...
</Tabs>
```

### Force Mount (mantener en DOM)
```jsx
<TabsContent value="profile" forceMount>
    {/* Se mantiene montado pero oculto */}
</TabsContent>
```

---

## 🏷️ Badge

Etiquetas para estados y categorías.

### Variantes
```jsx
<Badge variant="default">Default</Badge>
<Badge variant="primary">Nuevo</Badge>
<Badge variant="success">Activo</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="danger">Error</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="outline">Outline</Badge>
```

### Con indicador dot
```jsx
<Badge variant="success" dot>En línea</Badge>
<Badge variant="danger" dot>Desconectado</Badge>
```

### StatusBadge (preconfigurado)
```jsx
<StatusBadge status="active" />   // Verde: "Activo"
<StatusBadge status="inactive" /> // Rojo: "Inactivo"
<StatusBadge status="pending" />  // Amarillo: "Pendiente"
<StatusBadge status="draft" />    // Gris: "Borrador"
<StatusBadge status="paid" />     // Verde: "Pagado"
<StatusBadge status="open" />     // Azul: "Abierto"
<StatusBadge status="closed" />   // Gris: "Cerrado"
```

---

## 👤 Avatar

Imagen de perfil con fallback.

### Básico
```jsx
<Avatar src="/user.jpg" name="Juan Pérez" />
<Avatar name="María García" />  // Solo iniciales: MG
<Avatar />  // Icono por defecto
```

### Tamaños
```jsx
<Avatar size="xs" name="JP" />  // 24px
<Avatar size="sm" name="JP" />  // 32px
<Avatar size="md" name="JP" />  // 40px (default)
<Avatar size="lg" name="JP" />  // 48px
<Avatar size="xl" name="JP" />  // 64px
<Avatar size="2xl" name="JP" /> // 96px
```

### Grupo de avatares
```jsx
<AvatarGroup max={3}>
    <Avatar name="Juan" />
    <Avatar name="María" />
    <Avatar name="Pedro" />
    <Avatar name="Ana" />
    <Avatar name="Luis" />
</AvatarGroup>
// Muestra: JP, MG, PA, +2
```

---

## 💀 Skeleton

Placeholders para estados de carga.

### Básico
```jsx
<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-12 w-12 rounded-full" />
```

### Preconfigurados
```jsx
// Líneas de texto
<SkeletonText lines={3} />

// Tarjeta completa
<SkeletonCard />

// Tabla
<SkeletonTable rows={5} columns={4} />

// Formulario
<SkeletonForm fields={6} columns={2} />

// Loader de página
<PageLoader message="Cargando datos..." />
```

---

## 📝 Campos de Formulario

### InputField
```jsx
<InputField
    label="Nombre"
    name="name"
    value={value}
    onChange={handleChange}
    placeholder="Ingrese su nombre"
    required
    disabled
    type="email"  // text, email, number, date, password
/>
```

### SelectField
```jsx
<SelectField
    label="País"
    name="country"
    value={selected}
    onChange={handleChange}
    options={[
        { value: 've', label: 'Venezuela' },
        { value: 'co', label: 'Colombia' },
    ]}
/>
```

### ToggleField
```jsx
<ToggleField
    label="Notificaciones"
    name="notifications"
    checked={enabled}
    onChange={handleChange}
/>
```

---

## 🎨 Colores del Sistema

```css
nominix-dark:     #1A2B48  /* Navbars, botones primarios */
nominix-electric: #0052FF  /* Acentos, CTAs */
nominix-smoke:    #F8F9FA  /* Fondos */
nominix-surface:  #FFFFFF  /* Tarjetas */
```

---

## 📁 Estructura de Archivos

```
src/components/ui/
├── Button.jsx
├── Card.jsx
├── Modal.jsx
├── Tabs.jsx
├── Badge.jsx
├── Avatar.jsx
├── Skeleton.jsx
├── InputField.jsx
├── SelectField.jsx
├── ToggleField.jsx
└── index.js        ← Barrel export
```
