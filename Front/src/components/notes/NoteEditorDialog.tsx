import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button, Dialog, FormField, Input, Select, Textarea } from '@/components/ui';
import { NOTE_SCOPE_OPTIONS, NOTE_STATUS_OPTIONS } from '@/features/notes/labels';
import { agentNoteSchema, type AgentNoteFormType } from '@/schemas/agent-note.schema';
import type { IAgentNote } from '@/types';

const EMPTY_NOTE: AgentNoteFormType = {
  title: '',
  content: '',
  scope: 'global',
  status: 'draft',
  priority: 10,
};

export interface INoteEditorDialogProps {
  open: boolean;
  note: IAgentNote | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: AgentNoteFormType) => Promise<void>;
}

/** Create/edit form for an agent instruction. Validation lives in the schema. */
export function NoteEditorDialog({
  open,
  note,
  isSaving,
  onClose,
  onSubmit,
}: INoteEditorDialogProps) {
  const { register, handleSubmit, control, reset, formState } = useForm<AgentNoteFormType>({
    resolver: zodResolver(agentNoteSchema),
    defaultValues: EMPTY_NOTE,
    mode: 'onBlur',
  });

  // Re-seed whenever the dialog opens so edit and create never share state.
  useEffect(() => {
    if (!open) return;

    reset(
      note
        ? {
            title: note.title,
            content: note.content,
            scope: note.scope,
            status: note.status,
            priority: note.priority,
          }
        : EMPTY_NOTE,
    );
  }, [open, note, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={note ? 'Editar nota del agente' : 'Nueva nota del agente'}
      description="Las notas se inyectan en el prompt del asistente ordenadas por prioridad."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={() => void submit()}>
            {note ? 'Guardar cambios' : 'Crear nota'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField
          label="Título"
          error={formState.errors.title?.message}
          className="sm:col-span-2"
        >
          {({ id, describedBy }) => (
            <Input
              {...register('title')}
              id={id}
              aria-describedby={describedBy}
              placeholder="Política de descuentos"
              tone={formState.errors.title ? 'invalid' : 'default'}
            />
          )}
        </FormField>

        <FormField
          label="Instrucción"
          hint="Redáctala como una orden directa para el asistente."
          error={formState.errors.content?.message}
          className="sm:col-span-2"
        >
          {({ id, describedBy }) => (
            <Textarea
              {...register('content')}
              id={id}
              rows={6}
              aria-describedby={describedBy}
              invalid={Boolean(formState.errors.content)}
              placeholder="El descuento máximo autorizado es…"
            />
          )}
        </FormField>

        <FormField label="Alcance" error={formState.errors.scope?.message}>
          {({ id }) => (
            <Controller
              control={control}
              name="scope"
              render={({ field }) => (
                <Select
                  id={id}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={NOTE_SCOPE_OPTIONS}
                  aria-label="Alcance de la nota"
                />
              )}
            />
          )}
        </FormField>

        <FormField label="Estado" error={formState.errors.status?.message}>
          {({ id }) => (
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  id={id}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={NOTE_STATUS_OPTIONS}
                  aria-label="Estado de la nota"
                />
              )}
            />
          )}
        </FormField>

        <FormField
          label="Prioridad"
          hint="1 es la más alta. Se inyecta antes en el prompt."
          error={formState.errors.priority?.message}
        >
          {({ id, describedBy }) => (
            <Input
              {...register('priority')}
              id={id}
              type="number"
              min={1}
              max={99}
              aria-describedby={describedBy}
              tone={formState.errors.priority ? 'invalid' : 'default'}
            />
          )}
        </FormField>
      </form>
    </Dialog>
  );
}
