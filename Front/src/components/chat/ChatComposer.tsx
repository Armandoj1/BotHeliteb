import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Paperclip, SendHorizontal, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Textarea, Tooltip } from '@/components/ui';
import { EXTENSIONES_ADJUNTO, MAX_BYTES_ADJUNTO } from '@/services/chat.service';
import { messageSchema, type MessageFormType } from '@/schemas/message.schema';

export interface IChatComposerProps {
  isSending: boolean;
  onSend: (content: string, archivo?: File | null) => Promise<void>;
  disabled?: boolean;
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Message input. Enter sends, Shift+Enter inserts a line break. */
export function ChatComposer({ isSending, onSend, disabled = false }: IChatComposerProps) {
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState, watch } = useForm<MessageFormType>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
    mode: 'onSubmit',
  });

  const texto = watch('content');
  // Con un archivo adjunto el mensaje puede ir vacío: el documento ya es el
  // contenido, y el backend usa una instrucción por defecto ("resúmelo").
  const puedeEnviarSoloArchivo = archivo !== null && !texto?.trim();

  const limpiarArchivo = () => {
    setArchivo(null);
    setErrorArchivo(null);
    if (inputArchivo.current) inputArchivo.current.value = '';
  };

  const seleccionar = (elegido: File | null) => {
    if (!elegido) return;

    if (elegido.size > MAX_BYTES_ADJUNTO) {
      setErrorArchivo('El archivo supera los 10 MB.');
      return;
    }

    setErrorArchivo(null);
    setArchivo(elegido);
  };

  const enviar = async (contenido: string) => {
    await onSend(contenido, archivo);
    limpiarArchivo();
    reset({ content: '' });
  };

  const submit = handleSubmit(async ({ content }) => {
    await enviar(content);
  });

  // Con archivo y sin texto, el schema del formulario rechazaría el envío (exige
  // contenido), así que se llama directo saltando la validación.
  const submitOArchivo = () => {
    if (puedeEnviarSoloArchivo) {
      void enviar('');
      return;
    }
    void submit();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitOArchivo();
      }}
      className="border-t border-border pt-3"
      noValidate
    >
      {archivo ? (
        <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-border bg-surface-sunken/60 px-3 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">{archivo.name}</p>
            <p className="text-[11px] text-subtle">
              {formatearTamano(archivo.size)} · se leerá su texto y se le entregará al asistente
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={limpiarArchivo}
            aria-label="Quitar el archivo adjunto"
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : null}

      <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-surface p-1.5 pl-2.5 shadow-xs">
        <input
          ref={inputArchivo}
          type="file"
          accept={EXTENSIONES_ADJUNTO}
          className="hidden"
          onChange={(event) => seleccionar(event.target.files?.[0] ?? null)}
        />

        <Tooltip content="Adjuntar documento (PDF o texto)" side="top">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            disabled={disabled || isSending}
            onClick={() => inputArchivo.current?.click()}
            aria-label="Adjuntar documento"
          >
            <Paperclip aria-hidden />
          </Button>
        </Tooltip>

        <Textarea
          {...register('content')}
          rows={1}
          disabled={disabled || isSending}
          invalid={Boolean(formState.errors.content)}
          placeholder={archivo ? 'Añade una instrucción (opcional)…' : 'Escribe un mensaje…'}
          aria-label="Mensaje"
          className="max-h-32 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 shadow-none focus-visible:ring-0"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submitOArchivo();
            }
          }}
        />

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
        <p className="text-[11px] text-subtle">
          ⏎ para enviar · ⇧⏎ para salto de línea · PDF y texto hasta 10 MB
        </p>
        {errorArchivo ?? formState.errors.content ? (
          <p role="alert" className="text-[12px] text-danger">
            {errorArchivo ?? formState.errors.content?.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
