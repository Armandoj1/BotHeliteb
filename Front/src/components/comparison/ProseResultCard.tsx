import { AlertCircle, MessageSquareDashed } from 'lucide-react';

import { ProviderLogo } from '@/components/ai/ProviderLogo';
import { renderBold } from '@/components/common/RichText';
import { Badge, Card, StatusDot } from '@/components/ui';
import { getProviderDefinition } from '@/features/ai/config';
import { cn } from '@/lib/cn';
import type { ComparisonSlotType, IProseRunState, IProseVerdict, ProviderIdType } from '@/types';
import { formatNumber } from '@/utils/format-number';
import { ProseMetricsBar } from './ProseMetricsBar';

export interface IProseResultCardProps {
  slot: ComparisonSlotType;
  providerId: ProviderIdType | null;
  /** Second line under the provider name — the LLM in "full", nothing in "llm". */
  subtitle?: string;
  run: IProseRunState;
  verdict: IProseVerdict | null;
}

const AWARDS = [
  { key: 'fastest', label: 'Más rápido' },
  { key: 'cheapest', label: 'Más barato' },
  { key: 'mostConcise', label: 'Más conciso' },
] as const;

/** Text response card, shared by the `llm` and `full` categories. */
export function ProseResultCard({ slot, providerId, subtitle, run, verdict }: IProseResultCardProps) {
  const definition = providerId ? getProviderDefinition(providerId) : null;
  const wins = verdict ? AWARDS.filter((award) => verdict[award.key] === slot) : [];

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        {definition ? <ProviderLogo definition={definition} size="sm" /> : null}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {definition?.name ?? 'Sin proveedor'}
          </p>
          <p className="truncate font-mono text-[11px] text-subtle">{subtitle ?? definition?.vendor ?? '—'}</p>
        </div>

        {run.status === 'pending' || run.status === 'streaming' ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted">
            <StatusDot tone="primary" pulse />
            {run.status === 'pending' ? 'Esperando' : 'Escribiendo'}
          </span>
        ) : run.metrics ? (
          <span className="shrink-0 text-[12px] text-subtle" data-numeric>
            {formatNumber(run.metrics.tokensPerSecond)} tok/s
          </span>
        ) : null}
      </header>

      {wins.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {wins.map((award) => (
            <Badge key={award.key} tone="success">
              {award.label}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="min-h-[13rem] flex-1 border-t border-border px-4 py-3.5">
        {run.status === 'error' ? (
          <p className="flex items-start gap-2 text-[13px] text-danger">
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            {run.error}
          </p>
        ) : run.content ? (
          <p
            className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground"
            aria-live="polite"
          >
            {renderBold(run.content)}
            {run.status === 'streaming' ? (
              // Caret marks the stream as live without a spinner stealing focus.
              <span
                className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-foreground"
                aria-hidden
              />
            ) : null}
          </p>
        ) : (
          <div
            className={cn(
              'flex h-full flex-col items-center justify-center gap-2 text-center',
              'text-[12px] text-subtle',
            )}
          >
            <MessageSquareDashed className="size-5" aria-hidden />
            {run.status === 'pending' ? 'Contactando al proveedor…' : 'Sin respuesta todavía'}
          </div>
        )}
      </div>

      <ProseMetricsBar metrics={run.metrics} />
    </Card>
  );
}
