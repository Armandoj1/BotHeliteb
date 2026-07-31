import type { ISyncRun, ISyncSource, ResultType } from '@/types';

export interface ISyncOverview {
  sources: ISyncSource[];
  runs: ISyncRun[];
}

/**
 * Empty on purpose.
 *
 * The API exposes synchronisation only as inbound webhooks (`/webhook/sedes-sync`,
 * `/webhook/garantias-check`) triggered by n8n and guarded by a shared secret.
 * Nothing reports source health or run history, so the screen shows its empty
 * state until a `GET /api/sync/estado` exists. Fabricated rows would be worse
 * than an honest blank.
 */
export async function fetchSyncOverview(): Promise<ResultType<ISyncOverview>> {
  return { ok: true, value: { sources: [], runs: [] } };
}

export async function triggerSync(): Promise<ResultType<ISyncSource>> {
  return { ok: false, error: 'La sincronización todavía se dispara desde n8n, no desde el panel.' };
}
