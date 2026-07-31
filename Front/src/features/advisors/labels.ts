import type { AdvisorStatusType, ISelectOption, ToneType } from '@/types';

export const ADVISOR_STATUS_LABELS: Record<AdvisorStatusType, string> = {
  online: 'En línea',
  busy: 'Ocupado',
  away: 'Ausente',
  offline: 'Desconectado',
};

export const ADVISOR_STATUS_TONES: Record<AdvisorStatusType, ToneType> = {
  online: 'success',
  busy: 'warning',
  away: 'neutral',
  offline: 'neutral',
};

export const ADVISOR_STATUS_OPTIONS: ISelectOption<AdvisorStatusType | 'all'>[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'online', label: ADVISOR_STATUS_LABELS.online },
  { value: 'busy', label: ADVISOR_STATUS_LABELS.busy },
  { value: 'away', label: ADVISOR_STATUS_LABELS.away },
  { value: 'offline', label: ADVISOR_STATUS_LABELS.offline },
];

/** Workload thresholds keep the "carga" chip meaningful across team sizes. */
export function describeWorkload(activeConversations: number): { label: string; tone: ToneType } {
  if (activeConversations === 0) return { label: 'Sin carga', tone: 'neutral' };
  if (activeConversations >= 10) return { label: 'Saturado', tone: 'danger' };
  if (activeConversations >= 6) return { label: 'Alta', tone: 'warning' };
  return { label: 'Equilibrada', tone: 'success' };
}
