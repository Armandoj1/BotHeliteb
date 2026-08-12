import type { AgentChannelType, ISelectOption, NoteScopeType, NoteStatusType, ToneType } from '@/types';

export const NOTE_SCOPE_LABELS: Record<NoteScopeType, string> = {
  global: 'Global',
  channel: 'Por canal',
  product: 'Por producto',
  customer: 'Por cliente',
};

export const AGENT_CHANNEL_LABELS: Record<AgentChannelType, string> = {
  whatsapp: 'WhatsApp — cliente',
  escritorio: 'Escritorio — asesor',
};

export const AGENT_CHANNEL_OPTIONS: ISelectOption<AgentChannelType>[] = [
  {
    value: 'whatsapp',
    label: AGENT_CHANNEL_LABELS.whatsapp,
    description: 'Conversaciones del cliente final por WhatsApp o el CRM',
  },
  {
    value: 'escritorio',
    label: AGENT_CHANNEL_LABELS.escritorio,
    description: 'Consultas del equipo desde el panel',
  },
];

export const NOTE_STATUS_LABELS: Record<NoteStatusType, string> = {
  published: 'Publicada',
  draft: 'Borrador',
};

export const NOTE_STATUS_TONES: Record<NoteStatusType, ToneType> = {
  published: 'success',
  draft: 'warning',
};

export const NOTE_SCOPE_OPTIONS: ISelectOption<NoteScopeType>[] = [
  { value: 'global', label: NOTE_SCOPE_LABELS.global, description: 'Se aplica a toda conversación' },
  { value: 'channel', label: NOTE_SCOPE_LABELS.channel, description: 'Solo en un canal específico' },
  { value: 'product', label: NOTE_SCOPE_LABELS.product, description: 'Al hablar de una familia de productos' },
  { value: 'customer', label: NOTE_SCOPE_LABELS.customer, description: 'Para un segmento de clientes' },
];

export const NOTE_STATUS_OPTIONS: ISelectOption<NoteStatusType>[] = [
  { value: 'published', label: NOTE_STATUS_LABELS.published },
  { value: 'draft', label: NOTE_STATUS_LABELS.draft },
];

export const NOTE_SCOPE_FILTER_OPTIONS: ISelectOption<NoteScopeType | 'all'>[] = [
  { value: 'all', label: 'Todos los alcances' },
  ...NOTE_SCOPE_OPTIONS.map(({ value, label }) => ({ value, label })),
];
