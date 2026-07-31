import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { Sparkline } from '@/components/common/Sparkline';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import { staggerItem, TRANSITION } from '@/lib/motion';
import type { IMetric, TrendDirectionType } from '@/types';
import { formatMetric, formatPercent } from '@/utils/format-number';

const TREND_ICONS: Record<TrendDirectionType, typeof ArrowUpRight> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const TREND_CLASSES: Record<TrendDirectionType, string> = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-subtle',
};

export interface IMetricCardProps {
  metric: IMetric;
}

export function MetricCard({ metric }: IMetricCardProps) {
  const TrendIcon = TREND_ICONS[metric.direction];

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -2 }} transition={TRANSITION.fast}>
      <Card interactive className="flex h-full min-w-0 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-[12px] font-medium text-muted">{metric.label}</p>

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium',
                TREND_CLASSES[metric.direction],
              )}
            >
              <TrendIcon className="size-3.5" aria-hidden />
              <span data-numeric>
                {metric.direction === 'flat' ? 'Sin cambios' : formatPercent(Math.abs(metric.delta))}
              </span>
            </span>
          </div>

          <p
            className="mt-2.5 text-[26px] font-semibold leading-none tracking-[-0.035em] text-foreground"
            data-numeric
          >
            {formatMetric(metric.value, metric.format)}
          </p>

          <p className="mt-auto pt-2 text-[12px] leading-snug text-subtle">{metric.helper}</p>
        </div>

        {/* Full-bleed footer strip: the trend belongs to the card, not floating
            inside it. Neutral on purpose — the delta chip already encodes
            direction, and colouring the line too would double-encode it. */}
        <Sparkline series={metric.series} color="var(--foreground)" className="h-9 w-full" />
      </Card>
    </motion.div>
  );
}
