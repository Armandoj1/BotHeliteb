// Todas las llamadas pasan por /api/backend/* (el proxy autenticado de Astro), nunca
// directo al API .NET - el navegador ni siquiera conoce esa URL.
const BASE = '/api/backend';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error ?? body?.motivo ?? '';
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(detail || `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function apiGet<T>(path: string): Promise<T> {
  return fetch(`${BASE}/${path}`).then((res) => handle<T>(res));
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((res) => handle<T>(res));
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((res) => handle<T>(res));
}

export function apiDelete<T>(path: string): Promise<T> {
  return fetch(`${BASE}/${path}`, { method: 'DELETE' }).then((res) => handle<T>(res));
}
