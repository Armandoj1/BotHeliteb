import { useCallback, useMemo, useState } from 'react';

import { useListModule, type IListModule } from '@/hooks/useListModule';
import { fetchConversations } from '@/services/conversation.service';
import type { IConversation, IConversationFilters } from '@/types';
import { matchesQuery } from '@/utils/collection';

const INITIAL_FILTERS: IConversationFilters = { search: '', status: 'all', channel: 'all' };

/** Module-level so the memoised filter in `useCollectionQuery` stays stable. */
function matchesFilters(item: IConversation, filters: IConversationFilters): boolean {
  if (filters.status !== 'all' && item.status !== filters.status) return false;
  if (filters.channel !== 'all' && item.channel !== filters.channel) return false;

  return matchesQuery(item, filters.search, [
    'contactName',
    'contactHandle',
    'reference',
    'lastMessage',
    'assignedTo',
  ]);
}

export interface IConversationsState extends IListModule<IConversation, IConversationFilters> {
  selected: IConversation | null;
  select: (conversation: IConversation | null) => void;
  unreadTotal: number;
}

export function useConversations(): IConversationsState {
  const list = useListModule({
    loader: fetchConversations,
    initialFilters: INITIAL_FILTERS,
    predicate: matchesFilters,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => list.items.find((item) => item.id === selectedId) ?? null,
    [list.items, selectedId],
  );

  const select = useCallback(
    (conversation: IConversation | null) => setSelectedId(conversation?.id ?? null),
    [],
  );

  const unreadTotal = useMemo(
    () => list.items.reduce((total, item) => total + item.unread, 0),
    [list.items],
  );

  return { ...list, selected, select, unreadTotal };
}
