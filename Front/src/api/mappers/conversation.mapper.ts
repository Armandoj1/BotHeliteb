import type { IApiConversationSummary, IApiMensaje } from '@/api/contracts';
import type { IConversation, IMessage, MessageAuthorType } from '@/types';

const ROLE_MAP: Record<string, MessageAuthorType> = {
  user: 'customer',
  assistant: 'assistant',
  system: 'system',
  tool: 'system',
};

export function toMessageAuthor(role: string | null | undefined): MessageAuthorType {
  return ROLE_MAP[role ?? ''] ?? 'system';
}

export function toMessage(mensaje: IApiMensaje, index: number, telefono: string): IMessage {
  const author = toMessageAuthor(mensaje.role);

  return {
    id: `${telefono}-${index}`,
    author,
    authorName: author === 'customer' ? 'Cliente' : 'Asistente HELITEB',
    content: mensaje.content,
    createdAt: mensaje.created_at,
  };
}

/**
 * Every conversation in this backend arrives through WhatsApp and is keyed by
 * phone number. Status, assignment and sentiment do not exist upstream, so they
 * are derived from what the data actually supports rather than invented.
 */
export function toConversation(summary: IApiConversationSummary): IConversation {
  const waitingOnUs = summary.ultimo_mensaje_role === 'user';

  return {
    id: summary.telefono,
    reference: summary.telefono,
    contactName: summary.nombre_contacto?.trim() || summary.telefono,
    contactHandle: summary.telefono,
    channel: 'whatsapp',
    status: waitingOnUs ? 'pending' : 'open',
    assignedTo: 'Asistente',
    lastMessage: summary.ultimo_mensaje_preview ?? '',
    lastMessageAt: summary.ultimo_mensaje_en,
    unread: waitingOnUs ? 1 : 0,
    sentiment: 0,
    tags: [`${summary.total_mensajes} mensajes`],
    // Filled in on demand by `fetchConversationMessages`.
    messages: [],
  };
}
