import type { IRunMetrics } from '@/types';
import { formatCostUsd, formatDuration, formatNumber } from '@/utils/format-number';

export interface IProseMetricsBarProps {
  metrics: IRunMetrics | null;
}

const PLACEHOLDER = '—';
/** Distinct from any real value, including `formatCostUsd(0)` — this is "not measured", not "free". */
const NOT_MEASURED = 'No medido';

/**
 * The numbers that decide a model swap, in the order they get argued.
 * Renders placeholders rather than skeletons: the row must not change height
 * mid-run or the two cards would stop lining up.
 */
export function ProseMetricsBar({ metrics }: IProseMetricsBarProps) {
  const cells = [
    { label: 'Total', value: metrics ? formatDuration(metrics.totalMs) : PLACEHOLDER },
    { label: 'Velocidad', value: metrics ? `${formatNumber(metrics.tokensPerSecond)} tok/s` : PLACEHOLDER },
    { label: 'Tokens salida', value: metrics ? formatNumber(metrics.outputTokens) : PLACEHOLDER },
    {
      label: 'Costo',
      value: !metrics ? PLACEHOLDER : metrics.costUsd === null ? NOT_MEASURED : formatCostUsd(metrics.costUsd),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 border-t border-border bg-surface-sunken/60 px-4 py-3 sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0">
          <dt className="truncate text-[10px] uppercase tracking-wider text-subtle">
            {cell.label}
          </dt>
          <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground" data-numeric>
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
