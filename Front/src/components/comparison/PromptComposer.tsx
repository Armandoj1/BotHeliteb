import { ChevronDown, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Button, Card, FormField, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ComparisonPromptFormType } from '@/schemas/comparison.schema';
import type { ComparisonCategoryType } from '@/types';

export interface IPromptComposerProps {
  category: ComparisonCategoryType;
  form: UseFormReturn<ComparisonPromptFormType>;
  isRunning: boolean;
  canRun: boolean;
  hasResults: boolean;
  onRun: () => void;
  onReset: () => void;
  /** Only the `llm` category exposes a system prompt override — `full` uses production's own. */
  systemPrompt?: string;
  onSystemPromptChange?: (value: string) => void;
}

const COPY: Record<ComparisonCategoryType, { label: string; placeholder: string; footer: string }> = {
  llm: {
    label: 'Mensaje',
    placeholder: 'Escribe el mensaje que quieres enviar a los dos modelos…  ⌘⏎ para ejecutar',
    footer: 'Ambos modelos reciben el mismo mensaje, sin herramientas ni memoria, y arrancan en el mismo instante.',
  },
  embedding: {
    label: 'Consulta',
    placeholder: 'Escribe lo que buscarías en el catálogo…  ⌘⏎ para ejecutar',
    footer: 'La misma consulta se compara contra los vectores de ambos proveedores.',
  },
  full: {
    label: 'Mensaje',
    placeholder: 'Escribe el mensaje tal como lo enviaría un cliente…  ⌘⏎ para ejecutar',
    footer: 'Ambos agentes reciben el mismo mensaje, con sus herramientas activas, y arrancan en el mismo instante.',
  },
};

/** One message, sent verbatim to both slots — that is what makes it a bench. */
export function PromptComposer({
  category,
  form,
  isRunning,
  canRun,
  hasResults,
  onRun,
  onReset,
  systemPrompt,
  onSystemPromptChange,
}: IPromptComposerProps) {
  const [showSystem, setShowSystem] = useState(false);
  const { register, formState } = form;
  const copy = COPY[category];

  return (
    <Card className="overflow-hidden">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onRun();
        }}
        noValidate
      >
        <div className="p-4">
          <FormField label={copy.label} error={formState.errors.prompt?.message}>
            {({ id, describedBy }) => (
              <Textarea
                {...register('prompt')}
                id={id}
                rows={4}
                aria-describedby={describedBy}
                invalid={Boolean(formState.errors.prompt)}
                placeholder={copy.placeholder}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    onRun();
                  }
                }}
              />
            )}
          </FormField>

          {category === 'llm' && onSystemPromptChange ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowSystem((current) => !current)}
                aria-expanded={showSystem}
                className="inline-flex items-center gap-1.5 rounded-xs text-[12px] font-medium text-muted transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={cn('size-3.5 transition-transform', showSystem && 'rotate-180')}
                  aria-hidden
                />
                Instrucciones del sistema
              </button>

              {showSystem ? (
                <div className="mt-2.5">
                  <FormField
                    label="Prompt base"
                    hint="Se envía idéntico a ambos modelos para que la comparación sea justa."
                  >
                    {({ id }) => (
                      <Textarea
                        id={id}
                        rows={3}
                        value={systemPrompt}
                        onChange={(event) => onSystemPromptChange(event.target.value)}
                      />
                    )}
                  </FormField>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sunken/60 px-4 py-3">
          <p className="text-[12px] text-subtle">{copy.footer}</p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasResults && !isRunning}
              onClick={onReset}
              leftIcon={<RotateCcw aria-hidden />}
            >
              Limpiar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isRunning}
              disabled={!canRun}
              leftIcon={<Play aria-hidden />}
            >
              Comparar
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
