import { CloudAlert, Download, RefreshCw } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { Button, EmptyState } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useToast } from '@/hooks/useToast';
import { fetchDashboardSnapshot } from '@/services/dashboard.service';
import { ActivityFeed } from './ActivityFeed';
import { RankedBarList } from './RankedBarList';
import { ConversationsChart } from './ConversationsChart';
import { DashboardSkeleton } from './DashboardSkeleton';
import { MetricGrid } from './MetricGrid';
import { TokenUsageChart } from './TokenUsageChart';

/** Island root for `/`. One snapshot, one loading state, three chart regions. */
export function DashboardPanel() {
  const snapshot = useAsyncResource(fetchDashboardSnapshot);
  const toast = useToast();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel general"
        description="Resumen operativo: volumen de conversaciones, consumo de IA y actividad del equipo."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Download aria-hidden />}
              onClick={() =>
                toast.info({
                  title: 'Exportación en cola',
                  description: 'Recibirás un correo cuando el reporte esté listo.',
                })
              }
            >
              Exportar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw aria-hidden />}
              isLoading={snapshot.status === 'loading'}
              onClick={() => void snapshot.reload()}
            >
              Actualizar
            </Button>
          </>
        }
      />

      {snapshot.status === 'loading' ? (
        <DashboardSkeleton />
      ) : snapshot.status === 'error' || !snapshot.data ? (
        <EmptyState
          icon={CloudAlert}
          title="No se pudieron cargar las métricas"
          description={snapshot.error ?? 'Ocurrió un error inesperado al consultar el servidor.'}
          variant="page"
          action={
            <Button variant="secondary" size="sm" onClick={() => void snapshot.reload()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <>
          <MetricGrid metrics={snapshot.data.metrics} />

          <div className="grid gap-4 lg:grid-cols-3">
            {/* `min-w-0` is load-bearing: Recharts writes an explicit pixel
                width on its wrapper, and a grid item defaulting to
                `min-width:auto` would refuse to shrink back below it. */}
            <div className="min-w-0 lg:col-span-2">
              <ConversationsChart data={snapshot.data.timeseries} />
            </div>
            <RankedBarList
              title="Conversaciones por canal"
              description="Distribución del ciclo actual"
              unit="conversaciones"
              items={snapshot.data.channels.map((entry) => ({
                label: entry.channel,
                value: entry.value,
              }))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* `min-w-0` is load-bearing: Recharts writes an explicit pixel
                width on its wrapper, and a grid item defaulting to
                `min-width:auto` would refuse to shrink back below it. */}
            <div className="min-w-0 lg:col-span-2">
              <TokenUsageChart data={snapshot.data.tokenUsage} />
            </div>
            <ActivityFeed entries={snapshot.data.activity} />
          </div>
        </>
      )}
    </div>
  );
}
