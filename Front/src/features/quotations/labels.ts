import type { ISelectOption, QuotationStatusType, ToneType } from '@/types';

export const QUOTATION_STATUS_LABELS: Record<QuotationStatusType, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

export const QUOTATION_STATUS_TONES: Record<QuotationStatusType, ToneType> = {
  draft: 'neutral',
  sent: 'primary',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
};

export const QUOTATION_STATUS_OPTIONS: ISelectOption<QuotationStatusType | 'all'>[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'draft', label: QUOTATION_STATUS_LABELS.draft },
  { value: 'sent', label: QUOTATION_STATUS_LABELS.sent },
  { value: 'accepted', label: QUOTATION_STATUS_LABELS.accepted },
  { value: 'rejected', label: QUOTATION_STATUS_LABELS.rejected },
  { value: 'expired', label: QUOTATION_STATUS_LABELS.expired },
];
