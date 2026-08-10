import { STORAGE_KEYS } from '@/constants/app';
import type { ResultType } from '@/types';
import { storage } from '@/utils/storage';

const BASE_URL = import.meta.env.PUBLIC_API_URL ?? '';
const DEFAULT_TIMEOUT_MS = 20_000;

export interface IRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
  /** Skips the Authorization header — only the login endpoint needs this. */
  anonymous?: boolean;
}

/** Raised to the app when the API rejects the stored token. */
export const UNAUTHORIZED_ERROR = 'Tu sesión expiró. Vuelve a iniciar sesión.';

function readToken(): string | null {
  const session = storage.get<{ token?: string } | null>(STORAGE_KEYS.SESSION, null);
  return session?.token ?? null;
}

/**
 * Thin typed wrapper over `fetch`. Never throws: callers get a discriminated
 * `ResultType`, which keeps error handling explicit at every call site.
 *
 * The service layer is the only consumer — components must not import this.
 */
export async function request<T>(
  path: string,
  { body, timeoutMs = DEFAULT_TIMEOUT_MS, headers, anonymous = false, ...init }: IRequestOptions = {},
): Promise<ResultType<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const token = anonymous ? null : readToken();

  // Un FormData (subida de archivos) se manda tal cual: serializarlo a JSON lo
  // convertiría en "[object FormData]", y fijar Content-Type a mano rompe el
  // multipart — el navegador tiene que ponerlo él para incluir el boundary.
  const esFormData = body instanceof FormData;

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : esFormData ? (body as FormData) : JSON.stringify(body),
    });

    // The API protects every route by default, so a 401 always means the session
    // is gone. Clearing it here keeps the guard from looping on a dead token.
    if (response.status === 401 && !anonymous) {
      storage.remove(STORAGE_KEYS.SESSION);
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }

    if (!response.ok) {
      return { ok: false, error: await extractErrorMessage(response) };
    }

    if (response.status === 204) return { ok: true, value: undefined as T };

    return { ok: true, value: (await response.json()) as T };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, error: 'La solicitud excedió el tiempo de espera.' };
    }
    return { ok: false, error: 'No fue posible contactar al servidor.' };
  } finally {
    clearTimeout(timeout);
  }
}

/** The API answers errors as `{ motivo }` or `{ error }` depending on the module. */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { motivo?: string; error?: string; message?: string };
    return payload.motivo ?? payload.error ?? payload.message ?? `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

export const httpClient = {
  get: <T>(path: string, options?: IRequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: IRequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: IRequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: IRequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: IRequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
