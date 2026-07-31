import {
  BookOpen,
  BrainCircuit,
  Gauge,
  GitCompareArrows,
  MessageSquareText,
  NotebookPen,
  Package,
  ReceiptText,
  RefreshCcwDot,
  Settings2,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';

import type { INavGroup, INavItem } from '@/types';
import { ROUTES } from './routes';

/**
 * Single source of truth for the sidebar. Adding a module means adding an entry
 * here — navigation components never hardcode routes or labels.
 */
export const NAV_ITEMS: readonly INavItem[] = [
  {
    id: 'dashboard',
    label: 'Panel general',
    href: ROUTES.DASHBOARD,
    icon: Gauge,
    description: 'Métricas y actividad reciente',
    group: 'workspace',
  },
  {
    id: 'chat',
    label: 'Chat',
    href: ROUTES.CHAT,
    icon: MessageSquareText,
    description: 'Asistente en vivo',
    group: 'workspace',
  },
  {
    id: 'conversations',
    label: 'Conversaciones',
    href: ROUTES.CONVERSATIONS,
    icon: SlidersHorizontal,
    description: 'Conversaciones de WhatsApp con tus clientes',
    group: 'workspace',
  },
  {
    id: 'notes',
    label: 'Notas del agente',
    href: ROUTES.NOTES,
    icon: NotebookPen,
    description: 'Instrucciones que guían al asistente',
    group: 'workspace',
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    href: ROUTES.CATALOG,
    icon: Package,
    description: 'Productos y disponibilidad',
    group: 'commercial',
  },
  {
    id: 'quotations',
    label: 'Cotizaciones',
    href: ROUTES.QUOTATIONS,
    icon: ReceiptText,
    description: 'Propuestas enviadas y su estado',
    group: 'commercial',
  },
  {
    id: 'advisors',
    label: 'Asesores',
    href: ROUTES.ADVISORS,
    icon: UsersRound,
    description: 'Quién tiene acceso al panel',
    group: 'commercial',
  },
  {
    id: 'sync',
    label: 'Sincronización',
    href: ROUTES.SYNC,
    icon: RefreshCcwDot,
    description: 'Orígenes de datos conectados',
    group: 'platform',
  },
  {
    id: 'resources',
    label: 'Recursos',
    href: ROUTES.RESOURCES,
    icon: BookOpen,
    description: 'Base de conocimiento indexada',
    group: 'platform',
  },
  {
    id: 'ai-usage',
    label: 'Uso de IA',
    href: ROUTES.AI_USAGE,
    icon: BrainCircuit,
    description: 'Proveedores, credenciales y consumo',
    group: 'platform',
  },
  {
    id: 'compare',
    label: 'Comparador',
    href: ROUTES.COMPARE,
    icon: GitCompareArrows,
    description: 'Un mensaje, dos modelos, métricas lado a lado',
    group: 'platform',
  },
  {
    id: 'settings',
    label: 'Configuración',
    href: ROUTES.SETTINGS,
    icon: Settings2,
    description: 'Preferencias del panel',
    group: 'platform',
  },
] as const;

const GROUP_LABELS: Record<INavGroup['id'], string> = {
  workspace: 'General',
  commercial: 'Comercial',
  platform: 'Plataforma',
};

const GROUP_ORDER: ReadonlyArray<INavGroup['id']> = ['workspace', 'commercial', 'platform'];

export const NAV_GROUPS: readonly INavGroup[] = GROUP_ORDER.map((id) => ({
  id,
  label: GROUP_LABELS[id],
  items: NAV_ITEMS.filter((item) => item.group === id),
}));
