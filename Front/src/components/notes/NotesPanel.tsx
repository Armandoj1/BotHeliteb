import { motion } from 'framer-motion';
import { NotebookPen, Plus } from 'lucide-react';
import { useState } from 'react';

import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { DataToolbar } from '@/components/common/DataToolbar';
import { PageHeader } from '@/components/common/PageHeader';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Pagination,
  Select,
  Skeleton,
} from '@/components/ui';
import { useAgentNotes } from '@/features/notes/hooks/useAgentNotes';
import { NOTE_SCOPE_FILTER_OPTIONS } from '@/features/notes/labels';
import { staggerContainer } from '@/lib/motion';
import type { IAgentNote } from '@/types';
import { NoteCard } from './NoteCard';
import { NoteEditorDialog } from './NoteEditorDialog';

const GRID_CLASSES = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

/** Island root for `/notes`. */
export function NotesPanel() {
  const state = useAgentNotes();
  const { resource, query, filters } = state;
  const [pendingDeletion, setPendingDeletion] = useState<IAgentNote | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas del agente"
        description="Instrucciones permanentes que guían al asistente. Se inyectan en el prompt ordenadas por prioridad."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus aria-hidden />}
            onClick={() => state.openEditor(null)}
          >
            Nueva nota
          </Button>
        }
      />

      <DataToolbar
        query={filters.search}
        onQueryChange={(value) => state.setFilter('search', value)}
        searchPlaceholder="Buscar por título o contenido…"
        filters={
          <Select
            value={filters.scope}
            onValueChange={(value) => state.setFilter('scope', value)}
            options={NOTE_SCOPE_FILTER_OPTIONS}
            aria-label="Filtrar por alcance"
            className="w-48"
          />
        }
        actions={
          state.hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={state.resetFilters}>
              Limpiar filtros
            </Button>
          ) : null
        }
      />

      <AsyncBoundary
        status={resource.status}
        error={resource.error}
        onRetry={() => void resource.reload()}
        skeleton={
          <div className={GRID_CLASSES}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} shape="block" className="h-[214px]" />
            ))}
          </div>
        }
      >
        {query.matchCount === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title={state.hasActiveFilters ? 'Sin notas que coincidan' : 'Aún no hay notas'}
            description={
              state.hasActiveFilters
                ? 'Ajusta los filtros para ver el resto de instrucciones.'
                : 'Crea la primera instrucción para definir cómo debe comportarse el asistente.'
            }
            variant="page"
            action={
              <Button
                variant={state.hasActiveFilters ? 'secondary' : 'primary'}
                size="sm"
                onClick={state.hasActiveFilters ? state.resetFilters : () => state.openEditor(null)}
              >
                {state.hasActiveFilters ? 'Limpiar filtros' : 'Crear nota'}
              </Button>
            }
          />
        ) : (
          <>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={GRID_CLASSES}
            >
              {query.result.items.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={state.openEditor}
                  onDelete={setPendingDeletion}
                />
              ))}
            </motion.div>

            <Pagination
              page={query.result.page}
              totalPages={query.result.totalPages}
              total={query.result.total}
              pageSize={query.result.pageSize}
              onPageChange={query.setPage}
              className="rounded-xl border border-border bg-surface"
            />
          </>
        )}
      </AsyncBoundary>

      <NoteEditorDialog
        open={state.isEditorOpen}
        note={state.editing}
        isSaving={state.isSaving}
        onClose={state.closeEditor}
        onSubmit={state.save}
      />

      <ConfirmDialog
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
        title="Eliminar nota"
        description={`«${pendingDeletion?.title ?? ''}» dejará de aplicarse en las próximas conversaciones. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (pendingDeletion) void state.remove(pendingDeletion);
          setPendingDeletion(null);
        }}
      />
    </div>
  );
}
