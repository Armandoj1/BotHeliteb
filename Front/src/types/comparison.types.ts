import type { ProviderIdType } from './ai-provider.types';

/** Two slots, never more: the screen exists to compare A against B. */
export type ComparisonSlotType = 'a' | 'b';

export type RunStatusType = 'idle' | 'pending' | 'streaming' | 'done' | 'error';

/**
 * What the comparator measures. Each maps to a distinct backend capability, not
 * just a UI filter — a provider that cannot do the category simply cannot run.
 *
 *  - `llm`       raw model, no tools, no memory, no search: the LLM by itself.
 *  - `embedding` semantic search quality: which vectors rank the catalogue best.
 *  - `full`      the production agent: an LLM orchestrating tools, one of which
 *                is the embedding search — the two axes chosen independently.
 */
export type ComparisonCategoryType = 'llm' | 'embedding' | 'full';

/** What a provider can actually be asked to do — drives eligibility per category. */
export interface IProviderCapabilities {
  llm: boolean;
  embedding: boolean;
}

/**
 * Cost is only ever shown when the backend actually reports it (Gemini's usage
 * log does; DeepSeek/Groq completions do not). `null` means "not measured", and
 * must never render the same as `0` — one is missing data, the other is free.
 */
export interface IRunMetrics {
  totalMs: number;
  outputTokens: number;
  tokensPerSecond: number;
  costUsd: number | null;
}

export interface IProseRunState {
  status: RunStatusType;
  /** Text revealed so far; equals the final content once the run finishes. */
  content: string;
  metrics: IRunMetrics | null;
  error: string | null;
}

export interface ILlmSlot {
  llmProviderId: ProviderIdType;
}

export interface IFullSlot {
  llmProviderId: ProviderIdType;
  embeddingProviderId: ProviderIdType;
}

export type ComparisonWinnerType = ComparisonSlotType | 'tie';

export interface IProseVerdict {
  fastest: ComparisonWinnerType;
  mostConcise: ComparisonWinnerType;
  /** `null` when neither side reports cost — nothing to rank. */
  cheapest: ComparisonWinnerType | null;
}

// ---------------------------------------------------------------- embeddings

export interface ISemanticMatch {
  sku: string;
  brand: string;
  model: string;
  description: string | null;
  /** Cosine distance — lower is a closer match. Shown as-is, never re-scored. */
  distance: number;
}

export interface ISemanticRunState {
  status: RunStatusType;
  matches: ISemanticMatch[];
  elapsedMs: number | null;
  error: string | null;
}

export interface ISemanticVerdict {
  fastest: ComparisonWinnerType;
  /** More candidates returned for the same query, not a claim of better ones. */
  mostMatches: ComparisonWinnerType;
}
