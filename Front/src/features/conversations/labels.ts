import type { ChannelType, ConversationStatusType, ISelectOption, ToneType } from '@/types';

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatusType, string> = {
  open: 'Abierta',
  pending: 'Pendiente',
  resolved: 'Resuelta',
  escalated: 'Escalada',
};

export const CONVERSATION_STATUS_TONES: Record<ConversationStatusType, ToneType> = {
  open: 'primary',
  pending: 'warning',
  resolved: 'success',
  escalated: 'danger',
};

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  webchat: 'Webchat',
  email: 'Email',
  instagram: 'Instagram',
  telegram: 'Telegram',
};

export const STATUS_FILTER_OPTIONS: ISelectOption<ConversationStatusType | 'all'>[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'open', label: CONVERSATION_STATUS_LABELS.open },
  { value: 'pending', label: CONVERSATION_STATUS_LABELS.pending },
  { value: 'escalated', label: CONVERSATION_STATUS_LABELS.escalated },
  { value: 'resolved', label: CONVERSATION_STATUS_LABELS.resolved },
];

export const CHANNEL_FILTER_OPTIONS: ISelectOption<ChannelType | 'all'>[] = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'whatsapp', label: CHANNEL_LABELS.whatsapp },
  { value: 'webchat', label: CHANNEL_LABELS.webchat },
  { value: 'email', label: CHANNEL_LABELS.email },
  { value: 'instagram', label: CHANNEL_LABELS.instagram },
  { value: 'telegram', label: CHANNEL_LABELS.telegram },
];

/** Maps a -1…1 sentiment score to a human label and a badge tone. */
export function describeSentiment(score: number): { label: string; tone: ToneType } {
  if (score >= 0.4) return { label: 'Positivo', tone: 'success' };
  if (score <= -0.2) return { label: 'Negativo', tone: 'danger' };
  return { label: 'Neutral', tone: 'neutral' };
}
