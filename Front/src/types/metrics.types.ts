import type { IdType, TrendDirectionType } from './common.types';

export type MetricFormatType = 'number' | 'compact' | 'currency' | 'percent' | 'duration';

export interface IMetric {
  id: IdType;
  label: string;
  value: number;
  format: MetricFormatType;
  /** Percentage change against the previous period, e.g. 12.4 → +12.4%. */
  delta: number;
  direction: TrendDirectionType;
  helper: string;
  /** Sparkline series, oldest → newest. */
  series: number[];
}

export interface ITimeseriesPoint {
  date: string;
  conversations: number;
  messages: number;
  resolved: number;
}

export interface ITokenUsagePoint {
  date: string;
  input: number;
  output: number;
}

export interface IChannelBreakdown {
  channel: string;
  value: number;
}

export type ActivityKindType = 'conversation' | 'quotation' | 'sync' | 'provider' | 'advisor';

export interface IActivityEntry {
  id: IdType;
  kind: ActivityKindType;
  title: string;
  description: string;
  createdAt: string;
  actor: string;
}
