import type { MetricFormatType } from '@/types';

const LOCALE = 'es-MX';

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function formatNumber(value: number): string {
  return decimalFormatter.format(value);
}

export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

export function formatCurrency(value: number, currency = 'USD'): string {
  if (currency === 'USD') return currencyFormatter.format(value);
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/**
 * Per-request costs live in fractions of a cent, where the usual two decimals
 * would round every model down to `$0.00` and make comparison meaningless.
 */
export function formatCostUsd(value: number): string {
  if (value === 0) return 'Sin costo';
  if (value < 1) return `$${value.toFixed(4)}`;
  return formatCurrency(value);
}

/** Milliseconds → the shortest human-readable form (`820 ms`, `1.4 s`, `2 m 05 s`). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} m ${String(seconds).padStart(2, '0')} s`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** Single entry point used by metric cards so formatting stays declarative. */
export function formatMetric(value: number, format: MetricFormatType): string {
  switch (format) {
    case 'compact':
      return formatCompact(value);
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'duration':
      return formatDuration(value);
    case 'number':
    default:
      return formatNumber(value);
  }
}
