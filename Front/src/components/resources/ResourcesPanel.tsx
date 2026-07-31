import { BookOpen, Upload } from 'lucide-react';

import { ListScreen } from '@/components/common/ListScreen';
import { Badge, Button, Select } from '@/components/ui';
import { useResources } from '@/features/resources/hooks/useResources';
import { RESOURCE_KIND_OPTIONS } from '@/features/resources/labels';
import { formatCompact } from '@/utils/format-number';
import { ResourcesTable } from './ResourcesTable';

/** Island root for `/resources`. */
export function ResourcesPanel() {
  const state = useResources();
  const { resource, query, filters } = state;

  return (
    <ListScreen
      title="Recursos"
      description="Base de conocimiento que el asistente consulta antes de responder. Revisa el estado de indexación de cada fuente."
      headerActions={
        <>
          <Badge tone="primary" size="md">
            {formatCompact(state.totalChunks)} fragmentos
          </Badge>
          {state.failedCount > 0 ? (
            <Badge tone="danger" size="md" withDot>
              {state.failedCount} con error
            </Badge>
          ) : null}
          <Button variant="primary" size="sm" leftIcon={<Upload aria-hidden />}>
            Subir recurso
          </Button>
        </>
      }
      search={{
        value: filters.search,
        onChange: (value) => state.setFilter('search', value),
        placeholder: 'Buscar por título, descripción o propietario…',
      }}
      filters={
        <Select
          value={filters.kind}
          onValueChange={(value) => state.setFilter('kind', value)}
          options={RESOURCE_KIND_OPTIONS}
          aria-label="Filtrar por tipo"
          className="w-52"
        />
      }
      status={resource.status}
      error={resource.error}
      onRetry={() => void resource.reload()}
      skeletonColumns={7}
      matchCount={query.matchCount}
      hasActiveFilters={state.hasActiveFilters}
      onClearFilters={state.resetFilters}
      empty={{
        icon: BookOpen,
        title: 'La base de conocimiento está vacía',
        description:
          'Sube manuales, preguntas frecuentes o conjuntos de datos para que el asistente pueda apoyarse en ellos.',
      }}
      pagination={query.result}
      onPageChange={query.setPage}
    >
      <ResourcesTable
        resources={query.result.items}
        reindexingId={state.reindexingId}
        onReindex={(item) => void state.reindex(item)}
      />
    </ListScreen>
  );
}
