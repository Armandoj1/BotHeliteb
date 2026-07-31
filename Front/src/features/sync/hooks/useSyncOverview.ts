import { useCallback, useMemo, useState } from 'react';

import { useAsyncResource, type IAsyncResource } from '@/hooks/useAsyncResource';
import { useToast } from '@/hooks/useToast';
import { fetchSyncOverview, triggerSync, type ISyncOverview } from '@/services/sync.service';
import type { ISyncSource } from '@/types';

export interface ISyncOverviewState {
  resource: IAsyncResource<ISyncOverview>;
  syncingId: string | null;
  runSync: (source: ISyncSource) => Promise<void>;
  healthyCount: number;
  failingCount: number;
}

export function useSyncOverview(): ISyncOverviewState {
  const resource = useAsyncResource(fetchSyncOverview);
  const toast = useToast();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const sources = useMemo(() => resource.data?.sources ?? [], [resource.data]);

  const runSync = useCallback(
    async (source: ISyncSource) => {
      setSyncingId(source.id);
      const result = await triggerSync();
      setSyncingId(null);

      if (!result.ok) {
        toast.error({ title: 'No se pudo iniciar la sincronización', description: result.error });
        return;
      }

      const updated = result.value;
      resource.setData((current) => ({
        ...current,
        sources: current.sources.map((item) => (item.id === updated.id ? updated : item)),
      }));

      toast.info({
        title: 'Sincronización en curso',
        description: `${source.name} · se notificará al finalizar`,
      });
    },
    [resource, toast],
  );

  return {
    resource,
    syncingId,
    runSync,
    healthyCount: sources.filter((item) => item.state === 'healthy').length,
    failingCount: sources.filter((item) => item.state === 'failed' || item.state === 'degraded')
      .length,
  };
}
