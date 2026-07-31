import { useCallback, useState } from 'react';

import { useListModule, type IListModule } from '@/hooks/useListModule';
import { useToast } from '@/hooks/useToast';
import type { AgentNoteFormType } from '@/schemas/agent-note.schema';
import { deleteAgentNote, fetchAgentNotes, saveAgentNote } from '@/services/note.service';
import type { IAgentNote, NoteScopeType } from '@/types';
import { matchesQuery } from '@/utils/collection';

export interface INoteFilters {
  search: string;
  scope: NoteScopeType | 'all';
}

const INITIAL_FILTERS: INoteFilters = { search: '', scope: 'all' };
const PAGE_SIZE = 9;

function matchesFilters(item: IAgentNote, filters: INoteFilters): boolean {
  if (filters.scope !== 'all' && item.scope !== filters.scope) return false;
  return matchesQuery(item, filters.search, ['title', 'content', 'author']);
}

export interface IAgentNotesState extends IListModule<IAgentNote, INoteFilters> {
  editing: IAgentNote | null;
  isEditorOpen: boolean;
  isSaving: boolean;
  openEditor: (note: IAgentNote | null) => void;
  closeEditor: () => void;
  save: (values: AgentNoteFormType) => Promise<void>;
  remove: (note: IAgentNote) => Promise<void>;
}

export function useAgentNotes(): IAgentNotesState {
  const list = useListModule({
    loader: fetchAgentNotes,
    initialFilters: INITIAL_FILTERS,
    predicate: matchesFilters,
    pageSize: PAGE_SIZE,
  });

  const toast = useToast();
  const [editing, setEditing] = useState<IAgentNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { resource } = list;

  const openEditor = useCallback((note: IAgentNote | null) => {
    setEditing(note);
    setIsEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => setIsEditorOpen(false), []);

  const save = useCallback(
    async (values: AgentNoteFormType) => {
      setIsSaving(true);
      const result = await saveAgentNote(values, editing?.id);
      setIsSaving(false);

      if (!result.ok) {
        toast.error({ title: 'No se pudo guardar la nota', description: result.error });
        return;
      }

      const saved = result.value;
      resource.setData((current) =>
        editing
          ? current.map((note) => (note.id === saved.id ? saved : note))
          : [saved, ...current],
      );

      setIsEditorOpen(false);
      toast.success({
        title: editing ? 'Nota actualizada' : 'Nota creada',
        description: saved.title,
      });
    },
    [editing, resource, toast],
  );

  const remove = useCallback(
    async (note: IAgentNote) => {
      const result = await deleteAgentNote(note.id);

      if (!result.ok) {
        toast.error({ title: 'No se pudo eliminar la nota', description: result.error });
        return;
      }

      resource.setData((current) => current.filter((item) => item.id !== note.id));
      toast.info({ title: 'Nota eliminada', description: note.title });
    },
    [resource, toast],
  );

  return { ...list, editing, isEditorOpen, isSaving, openEditor, closeEditor, save, remove };
}
