import { Badge, StatusDot } from '@/components/ui';
import { STATUS_LABELS, STATUS_TONES } from '@/features/ai/utils/connection-status';
import type { ConnectionStatusType } from '@/types';

export interface IProviderStatusBadgeProps {
  status: ConnectionStatusType;
  latencyMs?: number | null;
}

/** Status is always conveyed by shape + text, never by colour alone. */
export function ProviderStatusBadge({ status, latencyMs }: IProviderStatusBadgeProps) {
  const tone = STATUS_TONES[status];

  return (
    <Badge tone={tone} className="gap-1.5">
      <StatusDot tone={tone} size="sm" pulse={status === 'testing'} />
      {STATUS_LABELS[status]}
      {status === 'connected' && typeof latencyMs === 'number' ? (
        <span className="opacity-70" data-numeric>
          · {latencyMs} ms
        </span>
      ) : null}
    </Badge>
  );
}
