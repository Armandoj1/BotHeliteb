import { motion } from 'framer-motion';
import { Coins, Gauge, Scissors } from 'lucide-react';

import { Card } from '@/components/ui';
import { getProviderDefinition } from '@/features/ai/config';
import { cn } from '@/lib/cn';
import { fadeInUp } from '@/lib/motion';
import type { ComparisonSlotType, ComparisonWinnerType, IProseVerdict, ProviderIdType } from '@/types';
import { formatDuration, formatNumber, formatCostUsd } from '@/utils/format-number';

export interface IProseVerdictBarProps {
  verdict: IProseVerdict;
  providerIds: Record<ComparisonSlotType, ProviderIdType | null>;
  metrics: Record<ComparisonSlotType, { totalMs: number; outputTokens: number; costUsd: number | null } | null>;
}

/**
 * Ranks only what can be measured. Which answer is *better* is a judgement the
 * operator makes by reading both, and the UI does not pretend to make it.
 */
export function ProseVerdictBar({ verdict, providerIds, metrics }: IProseVerdictBarProps) {
  const nameOf = (winner: ComparisonWinnerType) => {
    if (winner === 'tie') return 'Empate técnico';
    const providerId = providerIds[winner];
    return providerId ? getProviderDefinition(providerId).name : '—';
  };

  const detailOf = (winner: ComparisonWinnerType, read: (m: NonNullable<typeof metrics.a>) => string) => {
    if (winner === 'tie') {
      const a = metrics.a ? read(metrics.a) : '—';
      const b = metrics.b ? read(metrics.b) : '—';
      return `${a} vs ${b}`;
    }
    const m = metrics[winner];
    return m ? read(m) : '—';
  };

  const rows = [
    {
      icon: Gauge,
      label: 'Más rápido',
      winner: verdict.fastest,
      detail: detailOf(verdict.fastest, (m) => formatDuration(m.totalMs)),
    },
    {
      icon: Scissors,
      label: 'Más conciso',
      winner: verdict.mostConcise,
      detail: detailOf(verdict.mostConcise, (m) => `${formatNumber(m.outputTokens)} tokens`),
    },
    // Only shown when at least one side actually reports cost — otherwise the
    // row would rank a number neither provider gave us.
    ...(verdict.cheapest
      ? [
          {
            icon: Coins,
            label: 'Más barato',
            winner: verdict.cheapest,
            detail: detailOf(verdict.cheapest, (m) => (m.costUsd === null ? '—' : formatCostUsd(m.costUsd))),
          },
        ]
      : []),
  ];

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      {/* Column count follows the actual row count: cost drops out when neither
          side reports it, and a fixed 3-column grid would leave a bare, empty
          cell showing through the card's own gap colour. */}
      <Card className={cn('grid gap-px overflow-hidden bg-border', rows.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {rows.map(({ icon: Icon, label, winner, detail }) => (
          <div key={label} className="bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-subtle">
              <Icon className="size-3.5" aria-hidden />
              {label}
            </p>
            <p className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {nameOf(winner)}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted" data-numeric>
              {detail}
            </p>
          </div>
        ))}
      </Card>
    </motion.div>
  );
}
