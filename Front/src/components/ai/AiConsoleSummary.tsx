import { motion } from 'framer-motion';
import { Coins, PlugZap, TriangleAlert, Zap } from 'lucide-react';

import { StatTile } from '@/components/common/StatTile';
import { Skeleton } from '@/components/ui';
import { staggerContainer } from '@/lib/motion';
import type { IProviderUsage } from '@/types';
import { sumBy } from '@/utils/collection';
import { formatCompact, formatCurrency, formatNumber } from '@/utils/format-number';

export interface IAiConsoleSummaryProps {
  connectedCount: number;
  totalProviders: number;
  attentionCount: number;
  usage: readonly IProviderUsage[];
  isLoading: boolean;
}

export function AiConsoleSummary({
  connectedCount,
  totalProviders,
  attentionCount,
  usage,
  isLoading,
}: IAiConsoleSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} shape="block" className="h-[104px]" />
        ))}
      </div>
    );
  }

  const totalRequests = sumBy(usage, (item) => item.requests);
  const totalTokens = sumBy(usage, (item) => item.inputTokens + item.outputTokens);
  const totalCost = sumBy(usage, (item) => item.estimatedCost);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatTile
        label="Proveedores activos"
        value={`${connectedCount} / ${totalProviders}`}
        hint="Conexiones verificadas"
        icon={PlugZap}
        tone="success"
      />
      <StatTile
        label="Requieren atención"
        value={formatNumber(attentionCount)}
        hint={attentionCount === 0 ? 'Todo en orden' : 'Credenciales inválidas o incompletas'}
        icon={TriangleAlert}
        tone={attentionCount === 0 ? 'neutral' : 'warning'}
      />
      <StatTile
        label="Solicitudes del ciclo"
        value={formatCompact(totalRequests)}
        hint={`${formatCompact(totalTokens)} tokens procesados`}
        icon={Zap}
        tone="primary"
      />
      <StatTile
        label="Costo estimado"
        value={formatCurrency(totalCost)}
        hint="Periodo de facturación actual"
        icon={Coins}
        tone="neutral"
      />
    </motion.div>
  );
}
