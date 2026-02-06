/**
 * Sistema de Diseño UI - Nominix
 * 
 * Barrel file que exporta todos los componentes UI atómicos.
 * 
 * @example
 * import { Button, Card, Modal, Tabs, Badge, Avatar, Skeleton } from '@/components/ui';
 */

// ============ BUTTON ============
export { default as Button } from './Button';
export { Button as ButtonComponent, buttonVariants, buttonSizes } from './Button';

// ============ CARD ============
export { default as Card } from './Card';
export {
    Card as CardComponent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    CardSection,
    cardVariants,
    cardSizes
} from './Card';

// ============ MODAL ============
export { default as Modal } from './Modal';
export {
    Modal as ModalComponent,
    ModalFooter,
    ConfirmModal,
    modalSizes
} from './Modal';

// ============ TABS ============
export { default as Tabs } from './Tabs';
export {
    Tabs as TabsComponent,
    TabsList,
    TabsTrigger,
    TabsContent
} from './Tabs';

// ============ BADGE ============
export { default as Badge } from './Badge';
export {
    Badge as BadgeComponent,
    StatusBadge,
    badgeVariants,
    badgeSizes
} from './Badge';

// ============ AVATAR ============
export { default as Avatar } from './Avatar';
export {
    Avatar as AvatarComponent,
    AvatarGroup,
    avatarSizes
} from './Avatar';

// ============ SKELETON ============
export { default as Skeleton } from './Skeleton';
export {
    Skeleton as SkeletonComponent,
    SkeletonText,
    SkeletonCard,
    SkeletonTable,
    SkeletonForm,
    PageLoader
} from './Skeleton';

// ============ FORM FIELDS (Existentes) ============
export { default as InputField } from './InputField';
export { default as SelectField } from './SelectField';
export { default as ToggleField } from './ToggleField';
