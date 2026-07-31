import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import { toMessageAuthor } from '@/api/mappers/conversation.mapper';
import type { IApiMensaje } from '@/api/contracts';
import type { IMessage, ResultType } from '@/types';
import { isApiConfigured } from '@/services/transport';

/**
 * The panel's own chat with the agent — the same orchestrator that answers on
 * WhatsApp, reachable from the web without going through a phone.
 *
 * The session id namespaces the transcript per advisor, so two people using the
 * panel do not share a conversation and neither collides with a real customer
 * thread (which is keyed by phone number).
 */
export function buildSessionId(advisorId: string): string {
  return `panel-web-${advisorId}`;
}

const OFFLINE_ERROR = 'Configura PUBLIC_API_URL para conversar con el asistente.';

/** The agent runs tools and semantic search before answering; 20 s is not enough. */
const AGENT_TIMEOUT_MS = 120_000;

export async function fetchChatHistory(sessionId: string): Promise<ResultType<IMessage[]>> {
  if (!isApiConfigured()) return { ok: false, error: OFFLINE_ERROR };

  const result = await httpClient.get<IApiMensaje[]>(ENDPOINTS.chat.history(sessionId));
  if (!result.ok) return result;

  return {
    ok: true,
    value: (result.value ?? []).map((mensaje, index) => {
      const author = toMessageAuthor(mensaje.role);
      return {
        id: `${sessionId}-${index}`,
        author,
        authorName: author === 'customer' ? 'Tú' : 'Asistente HelitebAI',
        content: mensaje.content,
        createdAt: mensaje.created_at,
      };
    }),
  };
}

export async function sendChatMessage(
  sessionId: string,
  mensaje: string,
): Promise<ResultType<IMessage>> {
  if (!isApiConfigured()) return { ok: false, error: OFFLINE_ERROR };

  // snake_case: the API's JSON naming policy applies to binding as well.
  const result = await httpClient.post<{ respuesta: string }>(ENDPOINTS.chat.send, {
    session_id: sessionId,
    mensaje,
  }, { timeoutMs: AGENT_TIMEOUT_MS });
  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      id: `${sessionId}-${Date.now()}`,
      author: 'assistant',
      authorName: 'Asistente HelitebAI',
      content: result.value.respuesta,
      createdAt: new Date().toISOString(),
    },
  };
}
