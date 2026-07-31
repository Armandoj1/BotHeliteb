import type { IApiLoginResponse } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import { toUser } from '@/api/mappers/auth.mapper';
import { STORAGE_KEYS } from '@/constants/app';
import type { LoginFormType } from '@/schemas/auth.schema';
import type { ISession, ResultType } from '@/types';
import { storage } from '@/utils/storage';

/** Mirrors `Jwt:ExpiresHours` on the API; only used to expire the client copy early. */
const SESSION_HOURS = 8;
const REMEMBERED_SESSION_HOURS = 24 * 30;

/**
 * Authentication against `POST /api/auth/login` (correo + contraseña).
 *
 * The token is kept in `localStorage` because the panel is a static build that
 * talks to the API directly. That is a client-side convenience, never a security
 * boundary: the API validates the JWT on every request and rejects it on its own
 * expiry regardless of what the browser thinks.
 */
export async function signIn(values: LoginFormType): Promise<ResultType<ISession>> {
  const result = await httpClient.post<IApiLoginResponse>(
    ENDPOINTS.auth.login,
    { correo: values.email.trim(), password: values.password },
    { anonymous: true },
  );

  if (!result.ok) return result;

  const hours = values.remember ? REMEMBERED_SESSION_HOURS : SESSION_HOURS;
  const issuedAt = new Date();

  const session: ISession = {
    token: result.value.token,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + hours * 3_600_000).toISOString(),
    user: toUser(result.value.asesor),
  };

  storage.set(STORAGE_KEYS.SESSION, session);
  return { ok: true, value: session };
}

export function signOut(): void {
  storage.remove(STORAGE_KEYS.SESSION);
  void httpClient.post(ENDPOINTS.auth.logout, undefined, { anonymous: true });
}

/** Returns the stored session, or `null` when absent or expired. */
export function readSession(): ISession | null {
  const session = storage.get<ISession | null>(STORAGE_KEYS.SESSION, null);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    storage.remove(STORAGE_KEYS.SESSION);
    return null;
  }

  return session;
}
