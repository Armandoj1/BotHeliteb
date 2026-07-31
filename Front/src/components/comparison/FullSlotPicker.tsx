import { useMemo } from 'react';

import { ProviderLogo } from '@/components/ai/ProviderLogo';
import { Select } from '@/components/ui';
import { getProviderDefinition } from '@/features/ai/config';
import { listEligibleProviders } from '@/features/comparison/utils/available-models';
import type { ComparisonSlotType, IProviderConnection, ProviderIdType } from '@/types';
import type { FullAxisType } from '@/features/comparison/hooks/useFullCategoryComparison';

export interface IFullSlotPickerProps {
  slot: ComparisonSlotType;
  llmProviderId: ProviderIdType | null;
  embeddingProviderId: ProviderIdType | null;
  connections: readonly IProviderConnection[];
  disabled: boolean;
  onSelect: (slot: ComparisonSlotType, axis: FullAxisType, providerId: ProviderIdType) => void;
}

/**
 * Two independent selects per slot for the `full` category — one who
 * orchestrates (LLM), one who searches (embedding). This is what makes "a
 * cheap model embeds, a stronger one reasons" a runnable comparison instead of
 * a description.
 */
export function FullSlotPicker({
  slot,
  llmProviderId,
  embeddingProviderId,
  connections,
  disabled,
  onSelect,
}: IFullSlotPickerProps) {
  const llmOptions = useMemo(
    () =>
      listEligibleProviders(connections, 'llm').map((connection) => {
        const definition = getProviderDefinition(connection.providerId);
        return { value: connection.providerId, label: definition.name, description: 'Orquesta' };
      }),
    [connections],
  );

  const embeddingOptions = useMemo(
    () =>
      listEligibleProviders(connections, 'embedding').map((connection) => {
        const definition = getProviderDefinition(connection.providerId);
        return { value: connection.providerId, label: definition.name, description: 'Busca' };
      }),
    [connections],
  );

  const llmDefinition = llmProviderId ? getProviderDefinition(llmProviderId) : null;

  return (
    <div className="flex items-center gap-2.5">
      {llmDefinition ? <ProviderLogo definition={llmDefinition} size="sm" /> : null}

      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
        <Select
          value={llmProviderId ?? ''}
          onValueChange={(value) => onSelect(slot, 'llm', value as ProviderIdType)}
          options={llmOptions}
          disabled={disabled || llmOptions.length === 0}
          size="sm"
          placeholder="Orquestador"
          aria-label={`Modelo orquestador del slot ${slot.toUpperCase()}`}
        />
        <Select
          value={embeddingProviderId ?? ''}
          onValueChange={(value) => onSelect(slot, 'embedding', value as ProviderIdType)}
          options={embeddingOptions}
          disabled={disabled || embeddingOptions.length === 0}
          size="sm"
          placeholder="Embeddings"
          aria-label={`Proveedor de embeddings del slot ${slot.toUpperCase()}`}
        />
      </div>
    </div>
  );
}
