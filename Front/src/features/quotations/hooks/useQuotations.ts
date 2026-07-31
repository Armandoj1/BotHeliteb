import { useMemo } from 'react';

import { useListModule, type IListModule } from '@/hooks/useListModule';
import { fetchQuotations } from '@/services/quotation.service';
import type { IQuotation, IQuotationFilters } from '@/types';
import { matchesQuery, sumBy } from '@/utils/collection';

const INITIAL_FILTERS: IQuotationFilters = { search: '', status: 'all' };

function matchesFilters(item: IQuotation, filters: IQuotationFilters): boolean {
  if (filters.status !== 'all' && item.status !== filters.status) return false;

  return matchesQuery(item, filters.search, [
    'reference',
    'customerName',
    'customerCompany',
    'advisor',
  ]);
}

export interface IQuotationsState extends IListModule<IQuotation, IQuotationFilters> {
  /** Value of everything already accepted — the headline number of the screen. */
  acceptedValue: number;
  aiGeneratedShare: number;
}

export function useQuotations(): IQuotationsState {
  const list = useListModule({
    loader: fetchQuotations,
    initialFilters: INITIAL_FILTERS,
    predicate: matchesFilters,
  });

  const acceptedValue = useMemo(
    () => sumBy(list.items.filter((item) => item.status === 'accepted'), (item) => item.total),
    [list.items],
  );

  const aiGeneratedShare = useMemo(() => {
    if (list.items.length === 0) return 0;
    return list.items.filter((item) => item.generatedByAi).length / list.items.length;
  }, [list.items]);

  return { ...list, acceptedValue, aiGeneratedShare };
}
