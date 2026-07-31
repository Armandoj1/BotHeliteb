import type { IdType, Nullable } from './common.types';

export type SyncStateType = 'healthy' | 'syncing' | 'degraded' | 'failed' | 'paused';

export type SyncFrequencyType = 'realtime' | '15m' | 'hourly' | 'daily' | 'manual';

export interface ISyncSource {
  id: IdType;
  name: string;
  vendor: string;
  description: string;
  state: SyncStateType;
  frequency: SyncFrequencyType;
  lastRunAt: Nullable<string>;
  nextRunAt: Nullable<string>;
  recordsSynced: number;
  /** 0–100, only meaningful while `state === 'syncing'`. */
  progress: number;
  errorMessage: Nullable<string>;
}

export type SyncRunOutcomeType = 'success' | 'partial' | 'failed';

export interface ISyncRun {
  id: IdType;
  sourceId: IdType;
  sourceName: string;
  outcome: SyncRunOutcomeType;
  startedAt: string;
  durationMs: number;
  records: number;
}
