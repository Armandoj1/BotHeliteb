import { useCallback, useEffect, useState } from 'react';

import { runFullComparison } from '@/services/comparison.service';
import type { ComparisonSlotType, IProviderConnection, ProviderIdType } from '@/types';
import { firstEligible, listEligibleProviders } from '../utils/available-models';
import { useProseRunner, type IProseRunnerState } from './useProseRunner';

export type FullAxisType = 'llm' | 'embedding';

interface ISlotAxes {
  llmProviderId: ProviderIdType | null;
  embeddingProviderId: ProviderIdType | null;
}

export interface IFullCategoryState extends IProseRunnerState {
  slots: Record<ComparisonSlotType, ISlotAxes>;
  selectAxis: (slot: ComparisonSlotType, axis: FullAxisType, providerId: ProviderIdType) => void;
  canRun: boolean;
}

const EMPTY_SLOT: ISlotAxes = { llmProviderId: null, embeddingProviderId: null };

/**
 * Category "Completa": the production agent, with the LLM (who orchestrates
 * the tools) and the embedding provider (who resolves product search) chosen
 * independently per side — e.g. slot A = Groq + Ollama, slot B = DeepSeek +
 * Gemini. That independence is the whole point: a cheap model can embed while
 * a stronger one reasons, and the panel should let both sides prove it.
 */
export function useFullCategoryComparison(
  connections: readonly IProviderConnection[],
): IFullCategoryState {
  const [slots, setSlots] = useState<Record<ComparisonSlotType, ISlotAxes>>({
    a: EMPTY_SLOT,
    b: EMPTY_SLOT,
  });

  const eligibleLlm = listEligibleProviders(connections, 'llm');
  const eligibleEmbedding = listEligibleProviders(connections, 'embedding');

  // Seeds a sensible default pairing as soon as credentials load: slot A gets
  // the first of each axis, slot B gets the second when available so the two
  // sides start out different instead of racing themselves.
  useEffect(() => {
    if (eligibleLlm.length === 0 || eligibleEmbedding.length === 0) return;

    setSlots((current) => {
      const fill = (slot: ISlotAxes, llmSkip?: ProviderIdType, embeddingSkip?: ProviderIdType): ISlotAxes => ({
        llmProviderId:
          slot.llmProviderId && eligibleLlm.some((p) => p.providerId === slot.llmProviderId)
            ? slot.llmProviderId
            : (firstEligible(connections, 'llm', llmSkip) ?? null),
        embeddingProviderId:
          slot.embeddingProviderId && eligibleEmbedding.some((p) => p.providerId === slot.embeddingProviderId)
            ? slot.embeddingProviderId
            : (firstEligible(connections, 'embedding', embeddingSkip) ?? null),
      });

      const a = fill(current.a);
      const b = fill(current.b, a.llmProviderId ?? undefined, a.embeddingProviderId ?? undefined);
      return { a, b };
    });
    // `eligibleLlm`/`eligibleEmbedding` are pure derivations of `connections`,
    // so depending on `connections` alone covers both. Safe to re-run on every
    // refresh: `fill` only replaces a slot's provider when it is missing or no
    // longer eligible, so an operator's existing valid choice is never
    // silently discarded.
  }, [connections]);

  const selectAxis = useCallback(
    (slot: ComparisonSlotType, axis: FullAxisType, providerId: ProviderIdType) => {
      setSlots((current) => ({
        ...current,
        [slot]: {
          ...current[slot],
          [axis === 'llm' ? 'llmProviderId' : 'embeddingProviderId']: providerId,
        },
      }));
    },
    [],
  );

  const runner = useProseRunner(
    useCallback(
      (prompt: string) =>
        runFullComparison(
          { llmProviderId: slots.a.llmProviderId!, embeddingProviderId: slots.a.embeddingProviderId! },
          { llmProviderId: slots.b.llmProviderId!, embeddingProviderId: slots.b.embeddingProviderId! },
          prompt,
        ),
      [slots],
    ),
  );

  const canRun = Object.values(slots).every(
    (slot) => slot.llmProviderId !== null && slot.embeddingProviderId !== null,
  );

  return { ...runner, slots, selectAxis, canRun };
}
