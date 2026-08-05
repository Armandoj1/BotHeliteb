import type { IApiConversationSummary, IApiMensaje, IApiPagedResult } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import { toConversation, toMessage } from '@/api/mappers/conversation.mapper';
import type { IConversation, IMessage, ResultType } from '@/types';
import { isApiConfigured } from './transport';

/** The inbox is paged upstream; the panel filters client-side over one page. */
const PAGE_SIZE = 100;

/** Page 1 of the transcript is the most recent stretch, in chronological order. */
const MESSAGE_PAGE_SIZE = 200;

export async function fetchConversations(): Promise<ResultType<IConversation[]>> {
  if (!isApiConfigured()) return { ok: true, value: [] };

  const result = await httpClient.get<IApiPagedResult<IApiConversationSummary>>(
    `${ENDPOINTS.conversations.list}?page=1&pageSize=${PAGE_SIZE}`,
  );
  if (!result.ok) return result;

  return { ok: true, value: (result.value.items ?? []).map(toConversation) };
}

/**
 * Message bodies are fetched per conversation rather than with the list: the
 * inbox only needs a preview, and pulling every transcript upfront would be a
 * pointless round trip over the whole history.
 */
export async function fetchConversationMessages(telefono: string): Promise<ResultType<IMessage[]>> {
  if (!isApiConfigured()) return { ok: true, value: [] };

  // El endpoint devuelve una página ({ items, page, page_size, total }), no un
  // arreglo suelto. Estaba tipado como arreglo, así que el .map reventaba.
  const result = await httpClient.get<IApiPagedResult<IApiMensaje>>(
    `${ENDPOINTS.conversations.messages(telefono)}?page=1&pageSize=${MESSAGE_PAGE_SIZE}`,
  );
  if (!result.ok) return result;

  return {
    ok: true,
    value: (result.value.items ?? []).map((mensaje, index) => toMessage(mensaje, index, telefono)),
  };
}

/**
 * Sends through the agent (`POST /api/chat`) and returns its reply. This is the
 * same orchestrator the WhatsApp bot uses, so the panel answers exactly as a
 * customer would be answered.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ResultType<IMessage>> {
  if (!isApiConfigured()) {
    return { ok: false, error: 'Configura PUBLIC_API_URL para responder desde el panel.' };
  }

  const result = await httpClient.post<{ respuesta: string }>(ENDPOINTS.chat.send, {
    session_id: conversationId,
    mensaje: content,
  });
  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      id: `${conversationId}-${Date.now()}`,
      author: 'assistant',
      authorName: 'Asistente HELITEB',
      content: result.value.respuesta,
      createdAt: new Date().toISOString(),
    },
  };
}
