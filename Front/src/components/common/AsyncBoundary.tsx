import { CloudAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, EmptyState } from '@/components/ui';
import type { RequestStatusType } from '@/types';

export interface IAsyncBoundaryProps {
  status: RequestStatusType;
  error: string | null;
  /** Placeholder shown while the request is in flight. */
  skeleton: ReactNode;
  onRetry: () => void;
  children: ReactNode;
}

/**
 * Removes the loading/error ternary from every screen. Empty states stay with
 * the caller because "empty" is domain language, not a transport concern.
 */
export function AsyncBoundary({
  status,
  error,
  skeleton,
  onRetry,
  children,
}: IAsyncBoundaryProps) {
  if (status === 'loading' || status === 'idle') return <>{skeleton}</>;

  if (status === 'error') {
    return (
      <EmptyState
        icon={CloudAlert}
        title="No se pudo cargar la información"
        description={error ?? 'Ocurrió un error inesperado al consultar el servidor.'}
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
