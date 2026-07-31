import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_PAGE_SIZE } from '@/constants/app';
import type { IPaginatedResult } from '@/types';
import { paginate } from '@/utils/collection';

export interface IUseCollectionQueryOptions<T, F> {
  items: readonly T[];
  filters: F;
  /** Pure predicate — keeps filtering logic testable and outside components. */
  predicate: (item: T, filters: F) => boolean;
  pageSize?: number;
}

export interface ICollectionQuery<T> {
  page: number;
  setPage: (page: number) => void;
  result: IPaginatedResult<T>;
  /** Total before pagination — drives "no results" vs "empty collection". */
  matchCount: number;
}

/**
 * Filter + paginate any in-memory collection. Every list screen shares this so
 * paging behaviour, page resets and empty states are identical across modules.
 */
export function useCollectionQuery<T, F>({
  items,
  filters,
  predicate,
  pageSize = DEFAULT_PAGE_SIZE,
}: IUseCollectionQueryOptions<T, F>): ICollectionQuery<T> {
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => items.filter((item) => predicate(item, filters)),
    // `predicate` is expected to be module-level and stable.
    [items, filters, predicate],
  );

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const result = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);

  return { page: result.page, setPage, result, matchCount: filtered.length };
}
