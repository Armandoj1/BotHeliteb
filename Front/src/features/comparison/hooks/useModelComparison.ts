import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { useAsyncResource, type IAsyncResource } from '@/hooks/useAsyncResource';
import { comparisonPromptSchema, type ComparisonPromptFormType } from '@/schemas/comparison.schema';
import { fetchConnections } from '@/services/ai-provider.service';
import type { ComparisonCategoryType, IProviderConnection } from '@/types';
import { listEligibleProviders } from '../utils/available-models';
import { useFullCategoryComparison, type IFullCategoryState } from './useFullCategoryComparison';
import { useLlmCategoryComparison, type ILlmCategoryState } from './useLlmCategoryComparison';
import {
  useSemanticCategoryComparison,
  type ISemanticCategoryState,
} from './useSemanticCategoryComparison';

export interface IModelComparisonState {
  connections: IAsyncResource<IProviderConnection[]>;
  eligible: readonly IProviderConnection[];
  category: ComparisonCategoryType;
  setCategory: (category: ComparisonCategoryType) => void;
  form: UseFormReturn<ComparisonPromptFormType>;
  llm: ILlmCategoryState;
  full: IFullCategoryState;
  semantic: ISemanticCategoryState;
  isRunning: boolean;
  canRun: boolean;
  run: () => void;
  reset: () => void;
}

/**
 * Top-level orchestrator for the comparator. All three category hooks are
 * called unconditionally on every render (Rules of Hooks) — each stays idle
 * until its own `run` fires, so mounting all three costs nothing. This hook
 * only owns the category switch and the shared prompt field, and delegates
 * everything else to whichever category is active.
 */
export function useModelComparison(): IModelComparisonState {
  const connections = useAsyncResource(fetchConnections);
  const [category, setCategory] = useState<ComparisonCategoryType>('full');

  const items = connections.data ?? [];
  const llm = useLlmCategoryComparison(listEligibleProviders(items, 'llm'));
  const full = useFullCategoryComparison(items);
  const semantic = useSemanticCategoryComparison();

  const form = useForm<ComparisonPromptFormType>({
    resolver: zodResolver(comparisonPromptSchema),
    defaultValues: { prompt: '' },
    mode: 'onSubmit',
  });

  const active = category === 'llm' ? llm : category === 'full' ? full : semantic;

  const onSubmit = form.handleSubmit((values) => {
    active.run(values.prompt);
  });

  // Embedding runs need no slot selection — the backend always pairs
  // Ollama/Gemini — so there is nothing to gate beyond having a query.
  const canRun = category === 'embedding' ? true : (active as ILlmCategoryState | IFullCategoryState).canRun;

  return {
    connections,
    eligible: listEligibleProviders(items, category),
    category,
    setCategory,
    form,
    llm,
    full,
    semantic,
    isRunning: active.isRunning,
    canRun,
    run: () => void onSubmit(),
    reset: active.reset,
  };
}
