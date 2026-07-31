import { ExternalLink, HardDrive } from 'lucide-react';

import { Badge, Tooltip } from '@/components/ui';
import type { ConnectionStatusType, IProviderDefinition } from '@/types';
import { ProviderLogo } from './ProviderLogo';
import { ProviderStatusBadge } from './ProviderStatusBadge';

export interface IProviderCardHeaderProps {
  definition: IProviderDefinition;
  status: ConnectionStatusType;
  latencyMs: number | null;
  /** Obfuscated preview of the stored key, so it is identifiable but not readable. */
  maskedSecret?: string;
}

export function ProviderCardHeader({
  definition,
  status,
  latencyMs,
  maskedSecret,
}: IProviderCardHeaderProps) {
  return (
    <div className="flex items-start gap-3.5 px-5 pb-4 pt-5">
      <ProviderLogo definition={definition} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {definition.name}
          </h3>

          {definition.category === 'local' ? (
            <Tooltip content="La inferencia ocurre en tu propia infraestructura" side="top">
              <span>
                <Badge tone="outline" className="gap-1">
                  <HardDrive className="size-3" aria-hidden />
                  Local
                </Badge>
              </span>
            </Tooltip>
          ) : null}
        </div>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-subtle">
          {definition.vendor}
          {maskedSecret ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono tracking-tight">{maskedSecret}</span>
            </>
          ) : null}
        </p>
        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-muted">
          {definition.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <ProviderStatusBadge status={status} latencyMs={latencyMs} />

        <a
          href={definition.docsUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 rounded-xs text-[12px] text-subtle transition-colors hover:text-primary"
        >
          Docs
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}
