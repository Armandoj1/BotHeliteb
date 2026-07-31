import { AlertCircle, PackageSearch } from 'lucide-react';

import { Badge, Card, StatusDot } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ComparisonWinnerType, ISemanticRunState, ISemanticVerdict } from '@/types';
import { formatNumber } from '@/utils/format-number';

export interface ISemanticResultCardProps {
  side: 'ollama' | 'gemini';
  label: string;
  run: ISemanticRunState;
  verdict: ISemanticVerdict | null;
}

const AWARDS = [
  { key: 'fastest', label: 'Más rápido' },
  { key: 'mostMatches', label: 'Más resultados' },
] as const;

/** Ranked-list result card for the `embedding` category — no prose, no streaming. */
export function SemanticResultCard({ side, label, run, verdict }: ISemanticResultCardProps) {
  const winner: ComparisonWinnerType | undefined = side === 'ollama' ? 'a' : 'b';
  const wins = verdict ? AWARDS.filter((award) => verdict[award.key] === winner) : [];

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-[13px] font-semibold text-subtle">
          {label.charAt(0)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">{label}</p>
          <p className="truncate text-[11px] text-subtle">Búsqueda semántica sobre el catálogo</p>
        </div>

        {run.status === 'pending' ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted">
            <StatusDot tone="primary" pulse />
            Buscando
          </span>
        ) : run.elapsedMs !== null ? (
          <span className="shrink-0 text-[12px] text-subtle" data-numeric>
            {formatNumber(run.elapsedMs)} ms
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

      <div className="min-h-[13rem] flex-1 border-t border-border">
        {run.status === 'error' ? (
          <p className="flex items-start gap-2 px-4 py-3.5 text-[13px] text-danger">
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            {run.error}
          </p>
        ) : run.status === 'done' && run.matches.length === 0 ? (
          <div
            className={cn(
              'flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center',
              'text-[12px] text-subtle',
            )}
          >
            <PackageSearch className="size-5" aria-hidden />
            Sin coincidencias en el catálogo indexado
          </div>
        ) : run.matches.length > 0 ? (
          <ol className="divide-y divide-border">
            {run.matches.map((match, index) => (
              <li key={`${match.sku}-${index}`} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-muted text-[10px] font-semibold text-subtle"
                  data-numeric
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {match.brand} {match.model}
                  </p>
                  <p className="truncate text-[11px] text-subtle">
                    {match.sku}
                    {match.description ? ` · ${match.description}` : ''}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-subtle" data-numeric>
                  {match.distance.toFixed(4)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex h-full items-center justify-center px-4 py-8 text-[12px] text-subtle">
            {run.status === 'pending' ? 'Consultando el catálogo…' : 'Sin resultados todavía'}
          </div>
        )}
      </div>
    </Card>
  );
}
