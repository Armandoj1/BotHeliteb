import type { IApiEmbeddingsStatus, IApiEmbeddingsUso, IApiPruebaConexion } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import { STORAGE_KEYS } from '@/constants/app';
import {
  PROVIDER_DEFINITIONS,
  getProviderCapabilities,
  getProviderDefinition,
} from '@/features/ai/config';
import { resolveCompleteness } from '@/features/ai/utils/connection-status';
import { buildCredentialsSchema } from '@/schemas/provider-credentials.schema';
import type {
  IConnectionTestResult,
  IProviderConnection,
  IProviderUsage,
  ProviderCredentialsType,
  ProviderIdType,
  ResultType,
} from '@/types';
import { randomDelay } from '@/utils/async';
import { storage } from '@/utils/storage';
import { isApiConfigured } from './transport';

/**
 * Credentials console for every supported provider.
 *
 * Two things are true at once, and the screen has to reflect both honestly:
 *
 *  - The panel lets you configure all twelve providers, and those credentials
 *    persist in the browser. There is no credential vault in the API for most
 *    of them yet.
 *  - Four providers are wired to a real backend client (`getProviderCapabilities`):
 *    Ollama/Gemini for embeddings, DeepSeek/Groq for the LLM. For those, saving
 *    and testing hit the real API instead of only updating local state.
 */
export async function fetchConnections(): Promise<ResultType<IProviderConnection[]>> {
  await randomDelay(240, 480);
  const connections = readPersistedConnections();

  if (!isApiConfigured()) return { ok: true, value: connections };

  // Overlay live indexing state for the embedding axis — this is real usage
  // data the backend already tracks, unlike the LLM axis (see saveConnection).
  const status = await httpClient.get<IApiEmbeddingsStatus>(ENDPOINTS.ai.status);
  if (!status.ok) return { ok: true, value: connections };

  return {
    ok: true,
    value: connections.map((connection) => {
      if (!getProviderCapabilities(connection.providerId).embedding) return connection;

      const indexed = connection.providerId === 'gemini' ? status.value.gemini : status.value.ollama;
      const isActive = status.value.proveedor_activo === connection.providerId;

      return {
        ...connection,
        status: indexed.con_embedding > 0 ? 'connected' : 'incomplete',
        enabled: isActive,
        message: isActive
          ? `Proveedor activo · ${indexed.con_embedding} de ${status.value.total} productos indexados`
          : `${indexed.con_embedding} de ${status.value.total} indexados · ${indexed.pendientes} pendientes`,
      };
    }),
  };
}

export async function fetchProviderUsage(): Promise<ResultType<IProviderUsage[]>> {
  // Consumption is measured by the backend (`embedding_uso`); with no API there
  // is nothing to report, and an empty list is the honest answer.
  if (!isApiConfigured()) return { ok: true, value: [] };

  const result = await httpClient.get<IApiEmbeddingsUso>(ENDPOINTS.ai.usage(30));
  if (!result.ok) return result;

  const rows = result.value.resumen ?? [];
  const totalCalls = rows.reduce((total, row) => total + row.llamadas, 0) || 1;

  return {
    ok: true,
    value: rows.map((row) => ({
      providerId: row.proveedor as ProviderIdType,
      requests: row.llamadas,
      inputTokens: row.tokens,
      // Embeddings produce vectors, not completions — there is no output token.
      outputTokens: 0,
      estimatedCost: row.costo_estimado_usd,
      share: row.llamadas / totalCalls,
    })),
  };
}

export async function saveConnection(
  providerId: ProviderIdType,
  credentials: ProviderCredentialsType,
): Promise<ResultType<IProviderConnection>> {
  const definition = getProviderDefinition(providerId);

  const pushed = await pushEngineCredential(providerId, credentials);
  if (pushed && !pushed.ok) return pushed;
  if (!pushed) await randomDelay(280, 520);
  const completeness = resolveCompleteness(definition, credentials);
  const previous = findConnection(providerId);

  const next: IProviderConnection = {
    ...previous,
    credentials,
    // Saving never claims connectivity: only a successful test can do that.
    status:
      completeness === 'empty'
        ? 'disconnected'
        : completeness === 'incomplete'
          ? 'incomplete'
          : previous.status === 'connected'
            ? 'connected'
            : 'invalid',
    enabled: completeness !== 'empty',
    updatedAt: new Date().toISOString(),
  };

  persistConnection(next);
  return { ok: true, value: next };
}

export async function testConnection(
  providerId: ProviderIdType,
  credentials: ProviderCredentialsType,
): Promise<ResultType<IConnectionTestResult>> {
  const testedAt = new Date().toISOString();
  const definition = getProviderDefinition(providerId);
  const capabilities = getProviderCapabilities(providerId);

  // Real round trip for the providers the backend can actually reach.
  if (isApiConfigured() && (capabilities.llm || capabilities.embedding)) {
    // The backend checks the key it has stored, not the one on screen, so the
    // credential is pushed first. Otherwise testing a key you just typed would
    // always fail and tell you to save it — a loop with no exit.
    const pushed = await pushEngineCredential(providerId, credentials);
    if (pushed && !pushed.ok) return pushed;

    const testPath = capabilities.llm ? ENDPOINTS.ai.llmTest(providerId) : ENDPOINTS.ai.test(providerId);
    const result = await httpClient.post<IApiPruebaConexion>(testPath);
    if (!result.ok) return result;

    const probe = result.value;
    persistConnection({
      ...findConnection(providerId),
      credentials,
      status: probe.ok ? 'connected' : 'invalid',
      lastTestedAt: testedAt,
      latencyMs: probe.elapsed_ms,
      message: probe.ok ? `Respondió en ${probe.elapsed_ms} ms` : (probe.error ?? null),
    });

    return {
      ok: true,
      value: {
        status: probe.ok ? 'connected' : 'invalid',
        latencyMs: probe.elapsed_ms,
        testedAt,
        message: probe.ok
          ? `Conexión verificada · respondió en ${probe.elapsed_ms} ms`
          : (probe.error ?? 'El proveedor no respondió.'),
      },
    };
  }

  // For the rest the backend has no client, so the test is a credential-format
  // check. It is labelled as such instead of pretending a request was made.
  const startedAt = performance.now();
  await randomDelay(280, 560);
  const latencyMs = Math.round(performance.now() - startedAt);

  if (resolveCompleteness(definition, credentials) !== 'complete') {
    return {
      ok: true,
      value: {
        status: 'incomplete',
        latencyMs,
        testedAt,
        message: 'Completa los campos obligatorios antes de probar.',
      },
    };
  }

  const parsed = buildCredentialsSchema(definition).safeParse(credentials);
  if (!parsed.success) {
    return {
      ok: true,
      value: {
        status: 'invalid',
        latencyMs,
        testedAt,
        message: parsed.error.issues[0]?.message ?? 'Las credenciales no superaron la validación.',
      },
    };
  }

  const message = 'Formato válido · el motor aún no usa este proveedor';
  persistConnection({
    ...findConnection(providerId),
    credentials,
    status: 'connected',
    enabled: true,
    lastTestedAt: testedAt,
    latencyMs,
    message,
  });

  return { ok: true, value: { status: 'connected', latencyMs, testedAt, message } };
}

/** Clears the stored credentials for a provider and returns it to blank. */
export async function restoreConnection(
  providerId: ProviderIdType,
): Promise<ResultType<IProviderConnection>> {
  await randomDelay(180, 340);

  const blank = createBlankConnection(providerId);
  persistConnection(blank);
  return { ok: true, value: blank };
}

/**
 * Sends a credential to whichever backend endpoint actually stores it.
 *
 * Gemini's key lives under the embeddings route (it predates the LLM axis);
 * DeepSeek/Groq live under `/api/llm/*`. Once saved, the corresponding client
 * uses it instead of the `.env` value. Returns `null` when there is nothing to
 * push, so callers can tell "skipped" from "failed".
 */
async function pushEngineCredential(
  providerId: ProviderIdType,
  credentials: ProviderCredentialsType,
): Promise<ResultType<{ ok: boolean }> | null> {
  if (!isApiConfigured()) return null;

  const apiKey = credentials.apiKey?.trim();
  if (!apiKey) return null;

  if (providerId === 'gemini') {
    return httpClient.post<{ ok: boolean }>(ENDPOINTS.ai.geminiConfig, { api_key: apiKey });
  }
  if (getProviderCapabilities(providerId).llm) {
    return httpClient.post<{ ok: boolean }>(ENDPOINTS.ai.llmConfig(providerId), { api_key: apiKey });
  }
  return null;
}

function readPersistedConnections(): IProviderConnection[] {
  const overrides = storage.get<Record<string, IProviderConnection>>(STORAGE_KEYS.AI_CONNECTIONS, {});

  // No seeded credentials: a provider is blank until someone configures it.
  return PROVIDER_DEFINITIONS.map(
    (definition) => overrides[definition.id] ?? createBlankConnection(definition.id),
  );
}

function findConnection(providerId: ProviderIdType): IProviderConnection {
  return (
    readPersistedConnections().find((connection) => connection.providerId === providerId) ??
    createBlankConnection(providerId)
  );
}

function persistConnection(connection: IProviderConnection): void {
  const overrides = storage.get<Record<string, IProviderConnection>>(STORAGE_KEYS.AI_CONNECTIONS, {});
  storage.set(STORAGE_KEYS.AI_CONNECTIONS, { ...overrides, [connection.providerId]: connection });
}

/**
 * Ollama is the one provider with a knowable default: it runs beside the API in
 * the same compose network, so its address is not a secret to be discovered.
 * Everything else starts empty — a credential nobody entered is not a default.
 */
const LOCAL_DEFAULTS: Partial<Record<ProviderIdType, ProviderCredentialsType>> = {
  ollama: { baseUrl: 'http://ollama:11434', model: '' },
};

function createBlankConnection(providerId: ProviderIdType): IProviderConnection {
  return {
    providerId,
    status: 'disconnected',
    enabled: false,
    credentials: { ...(LOCAL_DEFAULTS[providerId] ?? {}) },
    lastTestedAt: null,
    latencyMs: null,
    message: null,
    updatedAt: null,
  };
}
