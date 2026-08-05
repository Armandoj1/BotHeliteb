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
 * El backend guarda TODA sesión del agente en la misma tabla, con la columna
 * `telefono` como llave: las de WhatsApp traen el número del cliente, pero las
 * del chat interno del panel y las del comparador de IA traen un identificador
 * sintético (`panel-web-3`, `cmp-ollama-a1b2`). Un número real es solo dígitos,
 * así que eso distingue el canal de verdad — antes se marcaba todo como
 * WhatsApp y las pruebas internas aparecían como si fueran clientes.
 */
export function isWhatsAppSession(telefono: string): boolean {
  return /^\d{7,15}$/.test(telefono.trim());
}

/**
 * Status, assignment and sentiment do not exist upstream, so they are derived
 * from what the data actually supports rather than invented.
 */
export function toConversation(summary: IApiConversationSummary): IConversation {
  const waitingOnUs = summary.ultimo_mensaje_role === 'user';
  const esWhatsApp = isWhatsAppSession(summary.telefono);

  return {
    id: summary.telefono,
    reference: summary.telefono,
    contactName:
      summary.nombre_contacto?.trim() ||
      (esWhatsApp ? summary.telefono : 'Prueba interna del panel'),
    contactHandle: summary.telefono,
    channel: esWhatsApp ? 'whatsapp' : 'webchat',
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
