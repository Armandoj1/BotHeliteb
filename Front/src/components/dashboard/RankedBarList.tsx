import { motion } from 'framer-motion';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { CHART_PRIMARY } from '@/lib/chart-theme';
import { staggerContainer, staggerItem, TRANSITION } from '@/lib/motion';
import { sumBy } from '@/utils/collection';
import { formatCompact, formatPercent } from '@/utils/format-number';

export interface IRankedBarItem {
  label: string;
  value: number;
}

export interface IRankedBarListProps {
  title: string;
  description: string;
  items: readonly IRankedBarItem[];
  /** Noun appended to the total, e.g. "conversaciones". */
  unit: string;
}

/**
 * Ranked comparison for more than two categories.
 *
 * A donut would need five distinguishable hues, which an achromatic palette
 * cannot provide honestly. Position plus a direct label carries the ranking, so
 * every bar shares one colour and the chart stays readable in both themes and
 * for colour-vision deficiencies.
 */
export function RankedBarList({ title, description, items, unit }: IRankedBarListProps) {
  const total = sumBy(items, (item) => item.value);
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="flex h-full flex-col p-0">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <p className="shrink-0 text-right">
          <span
            className="block text-[20px] font-semibold leading-none tracking-[-0.03em] text-foreground"
            data-numeric
          >
            {formatCompact(total)}
          </span>
          <span className="mt-1 block text-[11px] text-subtle">{unit}</span>
        </p>
      </CardHeader>

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-1 flex-col justify-center gap-4 px-5 pb-5"
      >
        {items.map((item) => (
          <motion.li key={item.label} variants={staggerItem}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] text-foreground">{item.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="text-[12px] text-subtle" data-numeric>
                  {formatPercent((item.value / total) * 100, 0)}
                </span>
                <span className="text-[13px] font-medium text-foreground" data-numeric>
                  {formatCompact(item.value)}
                </span>
              </span>
            </div>

            {/* Decorative: the ranking is already stated by order and figures. */}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: CHART_PRIMARY }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={TRANSITION.slow}
              />
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </Card>
  );
}
