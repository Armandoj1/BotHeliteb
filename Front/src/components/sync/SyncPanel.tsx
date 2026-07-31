import { motion } from 'framer-motion';

import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge, Skeleton } from '@/components/ui';
import { useSyncOverview } from '@/features/sync/hooks/useSyncOverview';
import { staggerContainer } from '@/lib/motion';
import { SyncRunsTable } from './SyncRunsTable';
import { SyncSourceCard } from './SyncSourceCard';

const GRID_CLASSES = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';

/** Island root for `/sync`. */
export function SyncPanel() {
  const state = useSyncOverview();
  const { resource } = state;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sincronización"
        description="Orígenes de datos conectados al asistente. Revisa su salud, frecuencia y última ejecución."
        actions={
          <>
            <Badge tone="success" size="md" withDot>
              {state.healthyCount} al día
            </Badge>
            {state.failingCount > 0 ? (
              <Badge tone="danger" size="md" withDot>
                {state.failingCount} con incidencias
              </Badge>
            ) : null}
          </>
        }
      />

      <AsyncBoundary
        status={resource.status}
        error={resource.error}
        onRetry={() => void resource.reload()}
        skeleton={
          <div className={GRID_CLASSES}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} shape="block" className="h-[300px]" />
            ))}
          </div>
        }
      >
        {resource.data ? (
          <div className="space-y-6">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={GRID_CLASSES}
            >
              {resource.data.sources.map((source) => (
                <SyncSourceCard
                  key={source.id}
                  source={source}
                  isTriggering={state.syncingId === source.id}
                  onRun={(item) => void state.runSync(item)}
                />
              ))}
            </motion.div>

            <SyncRunsTable runs={resource.data.runs} />
          </div>
        ) : null}
      </AsyncBoundary>
    </div>
  );
}
