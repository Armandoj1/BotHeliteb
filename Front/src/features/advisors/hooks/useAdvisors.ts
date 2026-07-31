import { useMemo } from 'react';

import { useListModule, type IListModule } from '@/hooks/useListModule';
import { fetchAdvisors } from '@/services/advisor.service';
import type { AdvisorStatusType, IAdvisor } from '@/types';
import { matchesQuery, sumBy } from '@/utils/collection';

export interface IAdvisorFilters {
  search: string;
  status: AdvisorStatusType | 'all';
}

const INITIAL_FILTERS: IAdvisorFilters = { search: '', status: 'all' };
/** Advisors render as cards, so the page shows the whole team at once. */
const PAGE_SIZE = 12;

function matchesFilters(item: IAdvisor, filters: IAdvisorFilters): boolean {
  if (filters.status !== 'all' && item.status !== filters.status) return false;
  return matchesQuery(item, filters.search, ['name', 'email', 'role']);
}

export interface IAdvisorsState extends IListModule<IAdvisor, IAdvisorFilters> {
  onlineCount: number;
  activeConversations: number;
}

export function useAdvisors(): IAdvisorsState {
  const list = useListModule({
    loader: fetchAdvisors,
    initialFilters: INITIAL_FILTERS,
    predicate: matchesFilters,
    pageSize: PAGE_SIZE,
  });

  const onlineCount = useMemo(
    () => list.items.filter((item) => item.status === 'online').length,
    [list.items],
  );

  const activeConversations = useMemo(
    () => sumBy(list.items, (item) => item.activeConversations),
    [list.items],
  );

  return { ...list, onlineCount, activeConversations };
}
