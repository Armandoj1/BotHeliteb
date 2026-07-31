import type { IApiAgentNota } from '@/api/contracts';
import type { IAgentNote } from '@/types';

/** The API stores one free-text field; the first line doubles as the title. */
function splitTitle(contenido: string): { title: string; content: string } {
  const trimmed = contenido.trim();
  const breakAt = trimmed.indexOf('\n');

  if (breakAt === -1) {
    const title = trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
    return { title, content: trimmed };
  }

  return { title: trimmed.slice(0, breakAt).trim(), content: trimmed.slice(breakAt + 1).trim() };
}

export function toAgentNote(nota: IApiAgentNota): IAgentNote {
  const { title, content } = splitTitle(nota.contenido);

  return {
    id: String(nota.id),
    title,
    content,
    // Every note in this API is injected globally into the system prompt.
    scope: 'global',
    status: nota.activo ? 'published' : 'draft',
    // No priority column upstream; the API returns them already ordered.
    priority: nota.id,
    author: 'Panel',
    updatedAt: nota.created_at,
    tags: [],
  };
}

/** Domain → wire: the API only accepts `contenido`, so title and body are joined. */
export function toNotaContenido(title: string, content: string): string {
  return `${title.trim()}\n${content.trim()}`;
}
