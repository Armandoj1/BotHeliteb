import type { IResource, ResultType } from '@/types';

/**
 * Empty on purpose.
 *
 * `GET /api/system/recursos` reports server RAM, disk and CPU — infrastructure
 * telemetry, not the indexed knowledge base this screen is about. Mapping one
 * onto the other would misrepresent both.
 */
export async function fetchResources(): Promise<ResultType<IResource[]>> {
  return { ok: true, value: [] };
}

export async function reindexResource(): Promise<ResultType<string>> {
  return { ok: false, error: 'La reindexación aún no está expuesta por el API.' };
}
