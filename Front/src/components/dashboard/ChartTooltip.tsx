import type { TooltipProps } from 'recharts';

import { formatCompact } from '@/utils/format-number';

export interface IChartTooltipProps extends TooltipProps<number, string> {
  /** Formats the group heading (usually a date). */
  labelFormatter?: (label: string) => string;
}

/** One tooltip for every chart, so numbers and chrome never drift. */
export function ChartTooltip({ active, payload, label, labelFormatter }: IChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-elevated px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium text-subtle">
        {labelFormatter ? labelFormatter(String(label)) : String(label)}
      </p>

      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2 text-[12px]">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-muted">{entry.name}</span>
            <span className="ml-auto font-medium text-foreground" data-numeric>
              {formatCompact(Number(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
