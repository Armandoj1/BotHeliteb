import type { IdType } from './common.types';

export type NoteScopeType = 'global' | 'channel' | 'product' | 'customer';

export type NoteStatusType = 'published' | 'draft';

export interface IAgentNote {
  id: IdType;
  title: string;
  content: string;
  scope: NoteScopeType;
  status: NoteStatusType;
  /** Higher priority notes are injected earlier in the system prompt. */
  priority: number;
  author: string;
  updatedAt: string;
  tags: string[];
}
