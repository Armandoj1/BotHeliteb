import { useCallback, useMemo, useState } from 'react';

import { useAsyncResource, type IAsyncResource } from '@/hooks/useAsyncResource';
import { useCollectionQuery, type ICollectionQuery } from '@/hooks/useCollectionQuery';
import type { ResultType } from '@/types';

export interface IUseListModuleOptions<T, F extends object> {
  loader: () => Promise<ResultType<T[]>>;
  initialFilters: F;
  /** Must be module-level (stable) so filtering stays memoised. */
  predicate: (item: T, filters: F) => boolean;
  pageSize?: number;
}

export interface IListModule<T, F> {
  resource: IAsyncResource<T[]>;
  items: readonly T[];
  query: ICollectionQuery<T>;
  filters: F;
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * The shape every list screen shares: fetch → filter → paginate, plus filter
 * reset semantics. Written once here instead of eight times across features.
 */
export function useListModule<T, F extends object>({
  loader,
  initialFilters,
  predicate,
  pageSize,
}: IUseListModuleOptions<T, F>): IListModule<T, F> {
  const resource = useAsyncResource(loader);
  const [filters, setFilters] = useState<F>(initialFilters);

  const items = useMemo(() => resource.data ?? [], [resource.data]);
  const query = useCollectionQuery({ items, filters, predicate, pageSize });

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(initialFilters), [initialFilters]);

  const hasActiveFilters = useMemo(
    () => (Object.keys(initialFilters) as Array<keyof F>).some((key) => filters[key] !== initialFilters[key]),
    [filters, initialFilters],
  );

  return { resource, items, query, filters, setFilter, resetFilters, hasActiveFilters };
}
