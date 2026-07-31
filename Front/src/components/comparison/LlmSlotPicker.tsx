import { useMemo } from 'react';

import { ProviderLogo } from '@/components/ai/ProviderLogo';
import { Select } from '@/components/ui';
import { getProviderDefinition } from '@/features/ai/config';
import type { ComparisonSlotType, IProviderConnection, ProviderIdType } from '@/types';

export interface ILlmSlotPickerProps {
  slot: ComparisonSlotType;
  providerId: ProviderIdType | null;
  eligible: readonly IProviderConnection[];
  disabled: boolean;
  onSelect: (slot: ComparisonSlotType, providerId: ProviderIdType) => void;
}

/** Single-provider picker for the `llm` category: one raw model per side. */
export function LlmSlotPicker({ slot, providerId, eligible, disabled, onSelect }: ILlmSlotPickerProps) {
  const options = useMemo(
    () =>
      eligible.map((connection) => {
        const definition = getProviderDefinition(connection.providerId);
        return { value: connection.providerId, label: definition.name, description: definition.vendor };
      }),
    [eligible],
  );

  const definition = providerId ? getProviderDefinition(providerId) : null;

  return (
    <div className="flex items-center gap-2.5">
      {definition ? <ProviderLogo definition={definition} size="sm" /> : null}
      <Select
        value={providerId ?? ''}
        onValueChange={(value) => onSelect(slot, value as ProviderIdType)}
        options={options}
        disabled={disabled || options.length === 0}
        size="sm"
        placeholder="Sin proveedores"
        aria-label={`Modelo del slot ${slot.toUpperCase()}`}
        className="flex-1"
      />
    </div>
  );
}
