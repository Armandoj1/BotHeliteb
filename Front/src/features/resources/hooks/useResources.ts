import { useCallback, useMemo, useState } from 'react';

import { useListModule, type IListModule } from '@/hooks/useListModule';
import { useToast } from '@/hooks/useToast';
import { fetchResources, reindexResource } from '@/services/resource.service';
import type { IResource, IResourceFilters } from '@/types';
import { matchesQuery, sumBy } from '@/utils/collection';

const INITIAL_FILTERS: IResourceFilters = { search: '', kind: 'all' };

function matchesFilters(item: IResource, filters: IResourceFilters): boolean {
  if (filters.kind !== 'all' && item.kind !== filters.kind) return false;
  return matchesQuery(item, filters.search, ['title', 'description', 'owner']);
}

export interface IResourcesState extends IListModule<IResource, IResourceFilters> {
  reindexingId: string | null;
  reindex: (resource: IResource) => Promise<void>;
  totalChunks: number;
  failedCount: number;
}

export function useResources(): IResourcesState {
  const list = useListModule({
    loader: fetchResources,
    initialFilters: INITIAL_FILTERS,
    predicate: matchesFilters,
  });

  const toast = useToast();
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const { resource } = list;

  const reindex = useCallback(
    async (item: IResource) => {
      setReindexingId(item.id);
      const result = await reindexResource();
      setReindexingId(null);

      if (!result.ok) {
        toast.error({ title: 'No se pudo reindexar', description: result.error });
        return;
      }

      resource.setData((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, indexState: 'processing' as const } : entry,
        ),
      );

      toast.info({ title: 'Reindexación en curso', description: item.title });
    },
    [resource, toast],
  );

  return {
    ...list,
    reindexingId,
    reindex,
    totalChunks: useMemo(() => sumBy(list.items, (item) => item.chunks), [list.items]),
    failedCount: useMemo(
      () => list.items.filter((item) => item.indexState === 'failed').length,
      [list.items],
    ),
  };
}
