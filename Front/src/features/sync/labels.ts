import type {
  SyncFrequencyType,
  SyncRunOutcomeType,
  SyncStateType,
  ToneType,
} from '@/types';

export const SYNC_STATE_LABELS: Record<SyncStateType, string> = {
  healthy: 'Al día',
  syncing: 'Sincronizando',
  degraded: 'Degradado',
  failed: 'Con errores',
  paused: 'En pausa',
};

export const SYNC_STATE_TONES: Record<SyncStateType, ToneType> = {
  healthy: 'success',
  syncing: 'primary',
  degraded: 'warning',
  failed: 'danger',
  paused: 'neutral',
};

export const SYNC_FREQUENCY_LABELS: Record<SyncFrequencyType, string> = {
  realtime: 'Tiempo real',
  '15m': 'Cada 15 minutos',
  hourly: 'Cada hora',
  daily: 'Diaria',
  manual: 'Manual',
};

export const SYNC_OUTCOME_LABELS: Record<SyncRunOutcomeType, string> = {
  success: 'Completada',
  partial: 'Parcial',
  failed: 'Fallida',
};

export const SYNC_OUTCOME_TONES: Record<SyncRunOutcomeType, ToneType> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
};
