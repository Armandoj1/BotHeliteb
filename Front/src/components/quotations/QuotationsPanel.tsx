import { Plus, ReceiptText } from 'lucide-react';

import { ListScreen } from '@/components/common/ListScreen';
import { Badge, Button, Select, TooltipProvider } from '@/components/ui';
import { useQuotations } from '@/features/quotations/hooks/useQuotations';
import { QUOTATION_STATUS_OPTIONS } from '@/features/quotations/labels';
import { formatCurrency, formatPercent } from '@/utils/format-number';
import { QuotationsTable } from './QuotationsTable';

/** Island root for `/quotations`. */
export function QuotationsPanel() {
  const state = useQuotations();
  const { resource, query, filters } = state;

  return (
    <TooltipProvider delayDuration={280}>
      <ListScreen
        title="Cotizaciones"
        description="Propuestas enviadas por el equipo y por el asistente, con su estado y vigencia."
        headerActions={
          <>
            <Badge tone="success" size="md">
              {formatCurrency(state.acceptedValue)} aceptado
            </Badge>
            <Badge tone="primary" size="md">
              {formatPercent(state.aiGeneratedShare * 100, 0)} con IA
            </Badge>
            <Button variant="primary" size="sm" leftIcon={<Plus aria-hidden />}>
              Nueva cotización
            </Button>
          </>
        }
        search={{
          value: filters.search,
          onChange: (value) => state.setFilter('search', value),
          placeholder: 'Buscar referencia, cliente o asesor…',
        }}
        filters={
          <Select
            value={filters.status}
            onValueChange={(value) => state.setFilter('status', value)}
            options={QUOTATION_STATUS_OPTIONS}
            aria-label="Filtrar por estado"
            className="w-44"
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
          icon: ReceiptText,
          title: 'Todavía no hay cotizaciones',
          description:
            'Cuando el asistente o un asesor genere una propuesta, aparecerá aquí con su estado y vigencia.',
        }}
        pagination={query.result}
        onPageChange={query.setPage}
      >
        <QuotationsTable quotations={query.result.items} />
      </ListScreen>
    </TooltipProvider>
  );
}
