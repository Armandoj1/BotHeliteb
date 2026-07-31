import { useMemo } from 'react';

import { useListModule, type IListModule } from '@/hooks/useListModule';
import { createAdvisor, fetchAdvisors } from '@/services/advisor.service';
import type { CreateAdvisorFormType } from '@/schemas/advisor.schema';
import type { AdvisorStatusType, IAdvisor, ResultType } from '@/types';
import { matchesQuery } from '@/utils/collection';

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
  create: (
    payload: CreateAdvisorFormType,
  ) => Promise<ResultType<{ advisor: IAdvisor; temporaryPassword: string }>>;
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

  const create = async (payload: CreateAdvisorFormType) => {
    const result = await createAdvisor(payload);
    if (result.ok) void list.resource.reload();
    return result;
  };

  return { ...list, onlineCount, create };
}
