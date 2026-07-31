import { motion } from 'framer-motion';
import { UserPlus, UsersRound } from 'lucide-react';

import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { DataToolbar } from '@/components/common/DataToolbar';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge, Button, EmptyState, Select, Skeleton } from '@/components/ui';
import { useAdvisors } from '@/features/advisors/hooks/useAdvisors';
import { ADVISOR_STATUS_OPTIONS } from '@/features/advisors/labels';
import { staggerContainer } from '@/lib/motion';
import { AdvisorCard } from './AdvisorCard';

const GRID_CLASSES = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

/** Island root for `/advisors`. Cards instead of rows: this is people, not data. */
export function AdvisorsPanel() {
  const state = useAdvisors();
  const { resource, query, filters } = state;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asesores"
        description="Equipo humano detrás del asistente: disponibilidad, carga de trabajo y desempeño del día."
        actions={
          <>
            <Badge tone="success" size="md" withDot>
              {state.onlineCount} en línea
            </Badge>
            <Badge tone="primary" size="md">
              {state.activeConversations} conversaciones activas
            </Badge>
            <Button variant="primary" size="sm" leftIcon={<UserPlus aria-hidden />}>
              Invitar asesor
            </Button>
          </>
        }
      />

      <DataToolbar
        query={filters.search}
        onQueryChange={(value) => state.setFilter('search', value)}
        searchPlaceholder="Buscar por nombre, correo o rol…"
        filters={
          <Select
            value={filters.status}
            onValueChange={(value) => state.setFilter('status', value)}
            options={ADVISOR_STATUS_OPTIONS}
            aria-label="Filtrar por estado"
            className="w-44"
          />
        }
        actions={
          state.hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={state.resetFilters}>
              Limpiar filtros
            </Button>
          ) : null
        }
      />

      <AsyncBoundary
        status={resource.status}
        error={resource.error}
        onRetry={() => void resource.reload()}
        skeleton={
          <div className={GRID_CLASSES}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} shape="block" className="h-[236px]" />
            ))}
          </div>
        }
      >
        {query.matchCount === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={state.hasActiveFilters ? 'Sin asesores que coincidan' : 'Aún no hay asesores'}
            description={
              state.hasActiveFilters
                ? 'Ajusta los filtros para ver al resto del equipo.'
                : 'Invita a tu equipo para que puedan atender las conversaciones escaladas.'
            }
            variant="page"
            action={
              state.hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={state.resetFilters}>
                  Limpiar filtros
                </Button>
              ) : null
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className={GRID_CLASSES}
          >
            {query.result.items.map((advisor) => (
              <AdvisorCard key={advisor.id} advisor={advisor} />
            ))}
          </motion.div>
        )}
      </AsyncBoundary>
    </div>
  );
}
