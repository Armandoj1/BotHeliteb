import type { IdType } from './common.types';

export type NoteScopeType = 'global' | 'channel' | 'product' | 'customer';

/**
 * Los dos comportamientos del agente: por WhatsApp habla el cliente final y hay
 * que venderle; en el escritorio consulta un asesor del equipo.
 */
export type AgentChannelType = 'whatsapp' | 'escritorio';

export type NoteStatusType = 'published' | 'draft';

export interface IAgentNote {
  id: IdType;
  title: string;
  content: string;
  scope: NoteScopeType;
  /** Solo cuando scope es 'channel'; null significa que aplica a todos. */
  channel: AgentChannelType | null;
  status: NoteStatusType;
  /** Higher priority notes are injected earlier in the system prompt. */
  priority: number;
  author: string;
  updatedAt: string;
  tags: string[];
}
