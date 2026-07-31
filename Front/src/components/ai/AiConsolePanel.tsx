import { CloudAlert } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import {
  Button,
  EmptyState,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from '@/components/ui';
import { PROVIDER_DEFINITIONS } from '@/features/ai/config';
import { useProviderConsole } from '@/features/ai/hooks/useProviderConsole';
import { AiConsoleSummary } from './AiConsoleSummary';
import { AiConsoleToolbar } from './AiConsoleToolbar';
import { ProviderCardSkeleton } from './ProviderCardSkeleton';
import { ProviderGrid } from './ProviderGrid';
import { ProviderUsageTable } from './ProviderUsageTable';

/** Island root for `/ai-usage`. Composition only — state lives in the hook. */
export function AiConsolePanel() {
  const state = useProviderConsole();
  const { connections, usage } = state;

  return (
    <TooltipProvider delayDuration={280}>
      <div className="space-y-6">
        <PageHeader
          title="Uso de IA"
          description="Administra las credenciales de cada proveedor, verifica su conectividad y revisa el consumo del espacio de trabajo."
        />

        <AiConsoleSummary
          connectedCount={state.connectedCount}
          totalProviders={PROVIDER_DEFINITIONS.length}
          attentionCount={state.attentionCount}
          usage={usage.data ?? []}
          isLoading={connections.status === 'loading' || usage.status === 'loading'}
        />

        <Tabs defaultValue="credentials" className="space-y-5">
          <TabsList>
            <TabsTrigger value="credentials">Credenciales</TabsTrigger>
            <TabsTrigger value="usage">Consumo</TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="space-y-5">
            <AiConsoleToolbar
              query={state.query}
              onQueryChange={state.setQuery}
              autosave={state.autosave}
              onAutosaveChange={state.setAutosave}
            />

            {connections.status === 'loading' ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <ProviderCardSkeleton key={index} />
                ))}
              </div>
            ) : connections.status === 'error' ? (
              <EmptyState
                icon={CloudAlert}
                title="No se pudieron cargar los proveedores"
                description={connections.error ?? 'Ocurrió un error inesperado.'}
                action={
                  <Button variant="secondary" size="sm" onClick={() => void connections.reload()}>
                    Reintentar
                  </Button>
                }
              />
            ) : (
              <ProviderGrid
                visibleProviderIds={state.visibleProviderIds}
                connectionsById={state.connectionsById}
                autosave={state.autosave}
                onConnectionChange={state.updateConnection}
                onClearSearch={() => state.setQuery('')}
              />
            )}
          </TabsContent>

          <TabsContent value="usage">
            {usage.status === 'loading' ? (
              <Skeleton shape="block" className="h-80" />
            ) : usage.status === 'error' ? (
              <EmptyState
                icon={CloudAlert}
                title="No se pudo cargar el consumo"
                description={usage.error ?? 'Ocurrió un error inesperado.'}
                action={
                  <Button variant="secondary" size="sm" onClick={() => void usage.reload()}>
                    Reintentar
                  </Button>
                }
              />
            ) : (
              <ProviderUsageTable usage={usage.data ?? []} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
