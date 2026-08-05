import { MessagesSquare } from 'lucide-react';

import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge, Button, Drawer, EmptyState, Separator, Skeleton } from '@/components/ui';
import {
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUS_TONES,
  describeSentiment,
} from '@/features/conversations/labels';
import { useConversationMessages } from '@/features/conversations/hooks/useConversationMessages';
import type { IConversation } from '@/types';
import { formatRelativeTime } from '@/utils/format-date';
import { ChannelIcon } from './ChannelIcon';
import { MessageThread } from './MessageThread';

export interface IConversationDetailDrawerProps {
  conversation: IConversation | null;
  onClose: () => void;
}

export function ConversationDetailDrawer({
  conversation,
  onClose,
}: IConversationDetailDrawerProps) {
  const sentiment = conversation ? describeSentiment(conversation.sentiment) : null;
  const hilo = useConversationMessages(conversation?.id ?? null);

  return (
    <Drawer
      open={conversation !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={conversation?.contactName ?? ''}
      description={conversation?.contactHandle}
      width="w-[min(32rem,94vw)]"
      footer={
        // Antes había aquí un "Abrir en Chat" sin onClick: no llevaba a ninguna
        // parte. La pestaña Chat es el sandbox del asesor con el bot (su sesión
        // se deriva del id de usuario), no el hilo del cliente, así que no hay
        // a dónde "abrirlo" - el hilo se lee aquí mismo.
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {conversation ? (
        <div className="flex h-full flex-col">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-[13px]">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-subtle">Referencia</dt>
              <dd className="mt-1 font-medium text-foreground">{conversation.reference}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-subtle">Canal</dt>
              <dd className="mt-1">
                <ChannelIcon channel={conversation.channel} withLabel />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-subtle">Estado</dt>
              <dd className="mt-1">
                <Badge tone={CONVERSATION_STATUS_TONES[conversation.status]} withDot>
                  {CONVERSATION_STATUS_LABELS[conversation.status]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-subtle">Sentimiento</dt>
              <dd className="mt-1">
                {sentiment ? <Badge tone={sentiment.tone}>{sentiment.label}</Badge> : null}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-subtle">Asignada a</dt>
              <dd className="mt-1 text-muted">{conversation.assignedTo}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-subtle">Actividad</dt>
              <dd className="mt-1 text-muted">
                {formatRelativeTime(conversation.lastMessageAt)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-subtle">Etiquetas</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {conversation.tags.map((tag) => (
                  <Badge key={tag} tone="outline">
                    {tag}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>

          <Separator />

          <div className="flex min-h-0 flex-1 flex-col bg-surface-sunken/40">
            <AsyncBoundary
              status={hilo.status}
              error={hilo.error}
              onRetry={hilo.reload}
              skeleton={
                <div className="flex flex-col gap-3 px-4 py-4">
                  <Skeleton className="h-14 w-3/4 rounded-lg" />
                  <Skeleton className="h-10 w-2/3 self-end rounded-lg" />
                  <Skeleton className="h-20 w-4/5 rounded-lg" />
                </div>
              }
            >
              {hilo.data && hilo.data.length > 0 ? (
                <MessageThread messages={hilo.data} className="flex-1" />
              ) : (
                <EmptyState
                  icon={MessagesSquare}
                  title="Sin mensajes"
                  description="Esta conversación no tiene mensajes guardados todavía."
                />
              )}
            </AsyncBoundary>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
