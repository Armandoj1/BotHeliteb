import { useCallback, useEffect, useState } from 'react';

import { runLlmComparison } from '@/services/comparison.service';
import type { ComparisonSlotType, IProviderConnection, ProviderIdType } from '@/types';
import { firstEligible } from '../utils/available-models';
import { useProseRunner, type IProseRunnerState } from './useProseRunner';

export interface ILlmCategoryState extends IProseRunnerState {
  slotProviders: Record<ComparisonSlotType, ProviderIdType | null>;
  selectProvider: (slot: ComparisonSlotType, providerId: ProviderIdType) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  /** Both slots must have a provider before `run` can be safely called. */
  canRun: boolean;
}

const DEFAULT_SYSTEM_PROMPT = 'Eres un asistente útil. Responde de forma breve y directa.';

/** Category "Modelo normal": one LLM per side, no tools, no memory, no search. */
export function useLlmCategoryComparison(eligible: readonly IProviderConnection[]): ILlmCategoryState {
  const [slotProviders, setSlotProviders] = useState<Record<ComparisonSlotType, ProviderIdType | null>>({
    a: null,
    b: null,
  });
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  // Seeds both slots as soon as the credentials load, and repairs a slot whose
  // provider stopped being eligible (e.g. its capability changed).
  useEffect(() => {
    if (eligible.length === 0) return;

    setSlotProviders((current) => {
      const stillValidA = eligible.some((item) => item.providerId === current.a);
      const stillValidB = eligible.some((item) => item.providerId === current.b);
      if (stillValidA && stillValidB && current.a !== current.b) return current;

      const a = stillValidA ? current.a! : (firstEligible(eligible, 'llm') ?? null);
      const b = stillValidB && current.b !== a ? current.b! : firstEligible(eligible, 'llm', a ?? undefined);
      return { a, b };
    });
  }, [eligible]);

  const selectProvider = useCallback((slot: ComparisonSlotType, providerId: ProviderIdType) => {
    setSlotProviders((current) => ({ ...current, [slot]: providerId }));
  }, []);

  const runner = useProseRunner(
    useCallback(
      (prompt: string) =>
        runLlmComparison(
          { llmProviderId: slotProviders.a! },
          { llmProviderId: slotProviders.b! },
          prompt,
          systemPrompt,
        ),
      [slotProviders, systemPrompt],
    ),
  );

  return {
    ...runner,
    slotProviders,
    selectProvider,
    systemPrompt,
    setSystemPrompt,
    canRun: slotProviders.a !== null && slotProviders.b !== null,
  };
}
