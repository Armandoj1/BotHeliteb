import { Inbox } from 'lucide-react';

import { ListScreen } from '@/components/common/ListScreen';
import { Badge, Select } from '@/components/ui';
import { useConversations } from '@/features/conversations/hooks/useConversations';
import {
  CHANNEL_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '@/features/conversations/labels';
import { ConversationDetailDrawer } from './ConversationDetailDrawer';
import { ConversationsTable } from './ConversationsTable';

/** Island root for `/conversations`. */
export function ConversationsPanel() {
  const state = useConversations();
  const { resource, query, filters } = state;

  return (
    <>
      <ListScreen
        title="Conversaciones"
        description="Bandeja unificada de todos los canales. Filtra, revisa el hilo completo y detecta escalamientos a tiempo."
        headerActions={
          state.unreadTotal > 0 ? (
            <Badge tone="primary" size="md" withDot>
              {state.unreadTotal} sin leer
            </Badge>
          ) : null
        }
        search={{
          value: filters.search,
          onChange: (value) => state.setFilter('search', value),
          placeholder: 'Buscar contacto, referencia o mensaje…',
        }}
        filters={
          <>
            <Select
              value={filters.status}
              onValueChange={(value) => state.setFilter('status', value)}
              options={STATUS_FILTER_OPTIONS}
              aria-label="Filtrar por estado"
              className="w-44"
            />
            <Select
              value={filters.channel}
              onValueChange={(value) => state.setFilter('channel', value)}
              options={CHANNEL_FILTER_OPTIONS}
              aria-label="Filtrar por canal"
              className="w-44"
            />
          </>
        }
        status={resource.status}
        error={resource.error}
        onRetry={() => void resource.reload()}
        skeletonColumns={7}
        matchCount={query.matchCount}
        hasActiveFilters={state.hasActiveFilters}
        onClearFilters={state.resetFilters}
        empty={{
          icon: Inbox,
          title: 'Tu bandeja está vacía',
          description:
            'Cuando un cliente escriba por cualquiera de los canales conectados, la conversación aparecerá aquí.',
        }}
        pagination={query.result}
        onPageChange={query.setPage}
      >
        <ConversationsTable conversations={query.result.items} onSelect={state.select} />
      </ListScreen>

      <ConversationDetailDrawer conversation={state.selected} onClose={() => state.select(null)} />
    </>
  );
}
