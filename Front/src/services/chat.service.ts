import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import type { IApiMensaje } from '@/api/contracts';
import type { IMessage, MessageAuthorType, ResultType } from '@/types';
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

// Distinto del mapeo de Conversaciones (toMessageAuthor): ahí "user" es el
// cliente de WhatsApp; aquí "user" es el propio asesor hablando con la IA -
// mismos nombres de rol del LLM, significado distinto según la pantalla.
function toChatAuthor(role: string | null | undefined): MessageAuthorType {
  if (role === 'assistant') return 'assistant';
  if (role === 'user') return 'user';
  return 'system';
}

export async function fetchChatHistory(sessionId: string): Promise<ResultType<IMessage[]>> {
  if (!isApiConfigured()) return { ok: false, error: OFFLINE_ERROR };

  const result = await httpClient.get<IApiMensaje[]>(ENDPOINTS.chat.history(sessionId));
  if (!result.ok) return result;

  return {
    ok: true,
    value: (result.value ?? []).map((mensaje, index) => {
      const author = toChatAuthor(mensaje.role);
      return {
        id: `${sessionId}-${index}`,
        author,
        authorName: author === 'user' ? 'Tú' : 'Asistente HelitebAI',
        content: mensaje.content,
        createdAt: mensaje.created_at,
      };
    }),
  };
}

/** Formatos que el backend sabe leer (ver ExtractorTextoAdjunto). */
export const EXTENSIONES_ADJUNTO = '.pdf,.txt,.md,.csv,.json,.xml,.log,.yml,.yaml,.htm,.html';
export const MAX_BYTES_ADJUNTO = 10 * 1024 * 1024;

/**
 * Envía un documento con (o sin) mensaje. El backend extrae el texto y se lo
 * pasa al agente: el modelo es de texto, no abre archivos. Por eso NO se aceptan
 * imágenes — el asesor recibiría una respuesta inventada sobre algo que el
 * modelo nunca vio.
 */
export async function sendChatFile(
  sessionId: string,
  archivo: File,
  mensaje: string,
): Promise<ResultType<IMessage>> {
  if (!isApiConfigured()) return { ok: false, error: OFFLINE_ERROR };

  if (archivo.size > MAX_BYTES_ADJUNTO) {
    return { ok: false, error: 'El archivo supera los 10 MB.' };
  }

  const form = new FormData();
  form.append('sessionId', sessionId);
  form.append('mensaje', mensaje);
  form.append('archivo', archivo);

  const result = await httpClient.post<{ respuesta: string }>(
    ENDPOINTS.chat.sendWithFile,
    form,
    { timeoutMs: AGENT_TIMEOUT_MS },
  );
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
