import { PlugZap } from 'lucide-react';

import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button, Card, EmptyState, Skeleton, TooltipProvider } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useModelComparison } from '@/features/comparison/hooks/useModelComparison';
import { CategoryTabs } from './CategoryTabs';
import { FullSlotPicker } from './FullSlotPicker';
import { LlmSlotPicker } from './LlmSlotPicker';
import { PromptComposer } from './PromptComposer';
import { ProseResultCard } from './ProseResultCard';
import { ProseVerdictBar } from './ProseVerdictBar';
import { SemanticResultCard } from './SemanticResultCard';
import { SemanticVerdictBar } from './SemanticVerdictBar';

const SLOTS = ['a', 'b'] as const;

const EMPTY_COPY = {
  llm: 'Ningún proveedor configurado puede correr como modelo (solo DeepSeek y Groq). Configúralo en Uso de IA.',
  embedding: 'Ollama y Gemini son los únicos proveedores de embeddings del backend. Configura uno en Uso de IA.',
  full: 'La categoría completa necesita al menos un modelo (DeepSeek/Groq) y un proveedor de embeddings (Ollama/Gemini) configurados.',
} as const;

/** Island root for `/compare`. */
export function ComparisonPanel() {
  const state = useModelComparison();
  const { connections, category } = state;

  return (
    <TooltipProvider delayDuration={280}>
      <div className="space-y-5">
        <PageHeader
          title="Comparador de modelos"
          description="Enfrenta proveedores en tres planos distintos: el modelo en bruto, la calidad de sus embeddings, o el agente completo tal como se comporta en producción."
        />

        <CategoryTabs category={category} onChange={state.setCategory} disabled={state.isRunning} />

        <AsyncBoundary
          status={connections.status}
          error={connections.error}
          onRetry={() => void connections.reload()}
          skeleton={
            <div className="space-y-5">
              <Skeleton shape="block" className="h-64" />
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton shape="block" className="h-80" />
                <Skeleton shape="block" className="h-80" />
              </div>
            </div>
          }
        >
          {state.eligible.length === 0 ? (
            <EmptyState
              icon={PlugZap}
              title="No hay proveedores disponibles para esta categoría"
              description={EMPTY_COPY[category]}
              variant="page"
              action={
                <Button variant="primary" size="sm" asChild>
                  <a href={ROUTES.AI_USAGE}>Configurar proveedores</a>
                </Button>
              }
            />
          ) : category === 'embedding' ? (
            <SemanticCategoryView state={state} />
          ) : category === 'llm' ? (
            <ProseCategoryView category="llm" state={state} />
          ) : (
            <ProseCategoryView category="full" state={state} />
          )}
        </AsyncBoundary>
      </div>
    </TooltipProvider>
  );
}

type ModelComparisonState = ReturnType<typeof useModelComparison>;

function ProseCategoryView({
  category,
  state,
}: {
  category: 'llm' | 'full';
  state: ModelComparisonState;
}) {
  const active = category === 'llm' ? state.llm : state.full;
  const hasResults = active.runs.a.status !== 'idle' || active.runs.b.status !== 'idle';

  const providerIds =
    category === 'llm'
      ? state.llm.slotProviders
      : { a: state.full.slots.a.llmProviderId, b: state.full.slots.b.llmProviderId };

  const metrics = {
    a: active.runs.a.metrics,
    b: active.runs.b.metrics,
  };

  return (
    <>
      <Card className="grid gap-4 p-4 lg:grid-cols-2">
        {SLOTS.map((slot) =>
          category === 'llm' ? (
            <LlmSlotPicker
              key={slot}
              slot={slot}
              providerId={state.llm.slotProviders[slot]}
              eligible={state.eligible}
              disabled={state.isRunning}
              onSelect={state.llm.selectProvider}
            />
          ) : (
            <FullSlotPicker
              key={slot}
              slot={slot}
              llmProviderId={state.full.slots[slot].llmProviderId}
              embeddingProviderId={state.full.slots[slot].embeddingProviderId}
              connections={state.connections.data ?? []}
              disabled={state.isRunning}
              onSelect={state.full.selectAxis}
            />
          ),
        )}
      </Card>

      <PromptComposer
        category={category}
        form={state.form}
        isRunning={state.isRunning}
        canRun={state.canRun}
        hasResults={hasResults}
        onRun={state.run}
        onReset={state.reset}
        systemPrompt={category === 'llm' ? state.llm.systemPrompt : undefined}
        onSystemPromptChange={category === 'llm' ? state.llm.setSystemPrompt : undefined}
      />

      {active.verdict ? (
        <ProseVerdictBar verdict={active.verdict} providerIds={providerIds} metrics={metrics} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {SLOTS.map((slot) => (
          <ProseResultCard
            key={slot}
            slot={slot}
            providerId={providerIds[slot]}
            subtitle={
              category === 'full' && state.full.slots[slot].embeddingProviderId
                ? `+ búsqueda: ${state.full.slots[slot].embeddingProviderId}`
                : undefined
            }
            run={active.runs[slot]}
            verdict={active.verdict}
          />
        ))}
      </div>
    </>
  );
}

function SemanticCategoryView({ state }: { state: ModelComparisonState }) {
  const { semantic } = state;
  const hasResults = semantic.runs.ollama.status !== 'idle' || semantic.runs.gemini.status !== 'idle';

  return (
    <>
      <PromptComposer
        category="embedding"
        form={state.form}
        isRunning={state.isRunning}
        canRun={state.canRun}
        hasResults={hasResults}
        onRun={state.run}
        onReset={state.reset}
      />

      {semantic.verdict ? <SemanticVerdictBar verdict={semantic.verdict} runs={semantic.runs} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SemanticResultCard side="ollama" label="Ollama" run={semantic.runs.ollama} verdict={semantic.verdict} />
        <SemanticResultCard side="gemini" label="Gemini" run={semantic.runs.gemini} verdict={semantic.verdict} />
      </div>
    </>
  );
}
