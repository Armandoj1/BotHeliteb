import type { IdType } from './common.types';

export type ChannelType = 'whatsapp' | 'webchat' | 'email' | 'instagram' | 'telegram';

export type ConversationStatusType = 'open' | 'pending' | 'resolved' | 'escalated';

// 'user' es exclusivo del chat interno asesor↔IA (ChatPanel): ahí el asesor es
// "el usuario" desde la perspectiva del LLM, distinto de 'customer' (el cliente
// de WhatsApp en Conversaciones) - ver outboundAuthors en MessageBubble, que
// decide qué lado se pinta como "propio" según la pantalla.
export type MessageAuthorType = 'customer' | 'agent' | 'assistant' | 'user' | 'system';

export interface IMessage {
  id: IdType;
  author: MessageAuthorType;
  authorName: string;
  content: string;
  createdAt: string;
  /** Present when the message was produced by an AI provider. */
  model?: string;
  tokens?: number;
}

export interface IConversation {
  id: IdType;
  reference: string;
  contactName: string;
  contactHandle: string;
  channel: ChannelType;
  status: ConversationStatusType;
  assignedTo: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  /** Sentiment score from -1 (negative) to 1 (positive). */
  sentiment: number;
  tags: string[];
  messages: IMessage[];
}

export interface IConversationFilters {
  search: string;
  status: ConversationStatusType | 'all';
  channel: ChannelType | 'all';
}
