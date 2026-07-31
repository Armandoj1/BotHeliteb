import { httpClient } from '@/api/http-client';
import type { ResultType } from '@/types';

/**
 * Single switch between the mock layer and the real HELITEB API.
 *
 * Services describe *what* they need (endpoint, mapper, mock fallback); this
 * module decides *where* it comes from. Setting `PUBLIC_API_URL` flips the whole
 * app onto real HTTP without touching a single hook or component.
 *
 * The mappers are what keep the wire format (snake_case, Spanish, .NET DTOs) from
 * leaking into the domain types the UI is built on.
 */
export function isApiConfigured(): boolean {
  return Boolean(import.meta.env.PUBLIC_API_URL);
}

export async function readResource<T>(path: string, mock: () => Promise<T>): Promise<ResultType<T>> {
  if (isApiConfigured()) return httpClient.get<T>(path);
  return { ok: true, value: await mock() };
}

/** Fetches a wire object and maps it into a domain type. */
export async function readMapped<TWire, TDomain>(
  path: string,
  map: (wire: TWire) => TDomain,
  mock: () => Promise<TDomain>,
): Promise<ResultType<TDomain>> {
  if (!isApiConfigured()) return { ok: true, value: await mock() };

  const result = await httpClient.get<TWire>(path);
  return result.ok ? { ok: true, value: map(result.value) } : result;
}

/** Fetches a wire array and maps every item. Tolerates a `null` body. */
export async function readCollection<TWire, TDomain>(
  path: string,
  map: (wire: TWire) => TDomain,
  mock: () => Promise<TDomain[]>,
): Promise<ResultType<TDomain[]>> {
  if (!isApiConfigured()) return { ok: true, value: await mock() };

  const result = await httpClient.get<TWire[]>(path);
  if (!result.ok) return result;

  return { ok: true, value: (result.value ?? []).map(map) };
}

export async function writeResource<T>(
  path: string,
  method: 'post' | 'put' | 'patch' | 'delete',
  body: unknown,
  mock: () => Promise<T>,
): Promise<ResultType<T>> {
  if (!isApiConfigured()) return { ok: true, value: await mock() };

  return method === 'delete' ? httpClient.delete<T>(path) : httpClient[method]<T>(path, body);
}
