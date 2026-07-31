import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, SendHorizontal, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button, Textarea, Tooltip } from '@/components/ui';
import { messageSchema, type MessageFormType } from '@/schemas/message.schema';

export interface IChatComposerProps {
  isSending: boolean;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

/** Message input. Enter sends, Shift+Enter inserts a line break. */
export function ChatComposer({ isSending, onSend, disabled = false }: IChatComposerProps) {
  const { register, handleSubmit, reset, formState } = useForm<MessageFormType>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
    mode: 'onSubmit',
  });

  const submit = handleSubmit(async ({ content }) => {
    await onSend(content);
    reset({ content: '' });
  });

  return (
    <form onSubmit={submit} className="border-t border-border pt-3" noValidate>
      <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-surface p-1.5 pl-2.5 shadow-xs">
        <Tooltip content="Adjuntar archivo" side="top">
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label="Adjuntar archivo">
            <Paperclip aria-hidden />
          </Button>
        </Tooltip>

        <Textarea
          {...register('content')}
          rows={1}
          disabled={disabled || isSending}
          invalid={Boolean(formState.errors.content)}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="max-h-32 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 shadow-none focus-visible:ring-0"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />

        <Tooltip content="Sugerir respuesta con IA" side="top">
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label="Sugerir respuesta con IA">
            <Sparkles aria-hidden />
          </Button>
        </Tooltip>

        <Button
          type="submit"
          variant="primary"
          size="icon-sm"
          className="shrink-0"
          isLoading={isSending}
          disabled={disabled}
          leftIcon={<SendHorizontal aria-hidden />}
          aria-label="Enviar mensaje"
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-1 pt-1.5">
        <p className="text-[11px] text-subtle">⏎ para enviar · ⇧⏎ para salto de línea</p>
        {formState.errors.content ? (
          <p role="alert" className="text-[12px] text-danger">
            {formState.errors.content.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
