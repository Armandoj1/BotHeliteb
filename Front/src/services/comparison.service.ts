import type {
  IApiCompararChatResponse,
  IApiCompararLlmResponse,
  IApiComparacionSearchResponse,
} from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import { toSemanticMatch } from '@/api/mappers/comparison.mapper';
import type { IFullSlot, ILlmSlot, IRunMetrics, ISemanticMatch, ResultType } from '@/types';
import { estimateTokens } from '@/utils/tokens';
import { isApiConfigured } from './transport';

/**
 * Agent calls are not API calls: the "full" category runs two complete
 * conversations — LLM plus every tool — in parallel, so the default client
 * timeout would abort a run that was going to succeed.
 */
const AGENT_TIMEOUT_MS = 180_000;
const LLM_TIMEOUT_MS = 60_000;

const OFFLINE_ERROR = 'Configura PUBLIC_API_URL para comparar modelos reales.';

export interface IProseOutcome {
  ok: boolean;
  content: string;
  metrics: IRunMetrics | null;
  error: string | null;
}

export interface ISemanticOutcome {
  ok: boolean;
  matches: ISemanticMatch[];
  elapsedMs: number | null;
  error: string | null;
}

function toProseOutcome(result: { ok: boolean; respuesta: string | null; elapsed_ms: number; error: string | null }): IProseOutcome {
  if (!result.ok) {
    return { ok: false, content: '', metrics: null, error: result.error ?? 'El proveedor no respondió.' };
  }

  const content = result.respuesta ?? '';
  // The APIs report total wall time only, never a token count — the token
  // figures here are estimated from character length, same as the rest of the
  // panel's cost previews (`utils/tokens`), never invented from nothing.
  const outputTokens = estimateTokens(content || ' ');
  const totalMs = Math.max(1, result.elapsed_ms);

  return {
    ok: true,
    content,
    error: null,
    metrics: {
      totalMs,
      outputTokens,
      tokensPerSecond: Math.max(1, Math.round(outputTokens / (totalMs / 1000))),
      // Neither DeepSeek nor Groq's completion response includes billed cost,
      // unlike Gemini's embedding usage log — `null` means "not measured".
      costUsd: null,
    },
  };
}

// ---------------------------------------------------------------- category: llm

export async function runLlmComparison(
  slotA: ILlmSlot,
  slotB: ILlmSlot,
  prompt: string,
  systemPrompt: string,
): Promise<ResultType<{ a: IProseOutcome; b: IProseOutcome }>> {
  if (!isApiConfigured()) return { ok: false, error: OFFLINE_ERROR };

  const result = await httpClient.post<IApiCompararLlmResponse>(
    ENDPOINTS.ai.compareLlm,
    {
      slot_a: { llm: slotA.llmProviderId },
      slot_b: { llm: slotB.llmProviderId },
      mensaje: prompt,
      system_prompt: systemPrompt,
    },
    { timeoutMs: LLM_TIMEOUT_MS },
  );
  if (!result.ok) return result;

  return {
    ok: true,
    value: { a: toProseOutcome(result.value.slot_a), b: toProseOutcome(result.value.slot_b) },
  };
}

// --------------------------------------------------------------- category: full

/** `cmp-a-m5k2n1x` — 13 chars, comfortably inside the column's 20. */
function buildSessionId(slot: 'a' | 'b'): string {
  return `cmp-${slot}-${Date.now().toString(36).slice(-7)}`;
}

export async function runFullComparison(
  slotA: IFullSlot,
  slotB: IFullSlot,
  prompt: string,
): Promise<ResultType<{ a: IProseOutcome; b: IProseOutcome }>> {
  if (!isApiConfigured()) return { ok: false, error: OFFLINE_ERROR };

  const result = await httpClient.post<IApiCompararChatResponse>(
    ENDPOINTS.ai.compareChat,
    {
      // Session ids must stay under 20 characters: the agent stores history in
      // `conversacion_sesion.telefono VARCHAR(20)`, and anything longer aborts
      // the run with a Postgres 22001 instead of answering.
      slot_a: { session_id: buildSessionId('a'), llm: slotA.llmProviderId, embedding: slotA.embeddingProviderId },
      slot_b: { session_id: buildSessionId('b'), llm: slotB.llmProviderId, embedding: slotB.embeddingProviderId },
      mensaje: prompt,
    },
    { timeoutMs: AGENT_TIMEOUT_MS },
  );
  if (!result.ok) return result;

  return {
    ok: true,
    value: { a: toProseOutcome(result.value.slot_a), b: toProseOutcome(result.value.slot_b) },
  };
}

// --------------------------------------------------------- category: embedding

/**
 * One call always compares Ollama against Gemini — the API has no per-slot
 * provider selection for search (`/embeddings/comparar` runs both by design).
 */
export async function runSemanticComparison(
  query: string,
): Promise<ResultType<{ ollama: ISemanticOutcome; gemini: ISemanticOutcome }>> {
  if (!isApiConfigured()) return { ok: false, error: OFFLINE_ERROR };

  const result = await httpClient.post<IApiComparacionSearchResponse>(ENDPOINTS.ai.compareSearch, {
    query,
  });
  if (!result.ok) return result;

  const toOutcome = (side: IApiComparacionSearchResponse['ollama']): ISemanticOutcome => ({
    ok: side.ok,
    matches: side.resultados?.map(toSemanticMatch) ?? [],
    elapsedMs: side.elapsed_ms,
    error: side.ok ? null : (side.error ?? 'El proveedor no respondió.'),
  });

  return { ok: true, value: { ollama: toOutcome(result.value.ollama), gemini: toOutcome(result.value.gemini) } };
}
