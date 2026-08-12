import type { IApiAgentNota } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { toAgentNote, toNotaContenido } from '@/api/mappers/note.mapper';
import type { AgentNoteFormType } from '@/schemas/agent-note.schema';
import type { IAgentNote, ResultType } from '@/types';
import { createId } from '@/utils/id';
import { isApiConfigured, readCollection, writeResource } from './transport';

export function fetchAgentNotes(): Promise<ResultType<IAgentNote[]>> {
  return readCollection<IApiAgentNota, IAgentNote>(
    ENDPOINTS.notes.list,
    toAgentNote,
    async () => [],
  );
}

/**
 * The API can create a note and flip its active flag, but has no update route —
 * editing an existing note therefore only syncs its published state, and the
 * text change stays local until `PUT /api/agente-notas/{id}` exists.
 */
export async function saveAgentNote(
  values: AgentNoteFormType,
  noteId?: string,
): Promise<ResultType<IAgentNote>> {
  const contenido = toNotaContenido(values.title, values.content);
  // Solo el alcance "Por canal" limita la nota; los demas la dejan para los dos.
  const canal = values.scope === 'channel' ? (values.channel ?? null) : null;

  if (isApiConfigured() && !noteId) {
    const created = await writeResource<IApiAgentNota>(
      ENDPOINTS.notes.list,
      'post',
      { contenido, canal },
      async () => ({ id: 0, contenido, canal, activo: true, created_at: new Date().toISOString() }),
    );
    return created.ok ? { ok: true, value: toAgentNote(created.value) } : created;
  }

  if (isApiConfigured() && noteId) {
    const numericId = Number(noteId);
    const path =
      values.status === 'published'
        ? ENDPOINTS.notes.activate(numericId)
        : ENDPOINTS.notes.deactivate(numericId);

    const result = await writeResource<{ ok: boolean }>(path, 'patch', undefined, async () => ({
      ok: true,
    }));
    if (!result.ok) return result;
  }

  // Without an API there is nothing to persist against; the note is echoed back
  // so the dialog can close, but nothing is stored.
  return {
    ok: true,
    value: {
      id: noteId ?? createId('note'),
      channel: canal,
      author: 'Panel',
      tags: [],
      updatedAt: new Date().toISOString(),
      ...values,
    },
  };
}

export function deleteAgentNote(noteId: string): Promise<ResultType<string>> {
  return writeResource(ENDPOINTS.notes.remove(Number(noteId)), 'delete', undefined, async () => noteId).then((result) => (result.ok ? { ok: true, value: noteId } : result));
}
