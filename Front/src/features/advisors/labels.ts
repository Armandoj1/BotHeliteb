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
