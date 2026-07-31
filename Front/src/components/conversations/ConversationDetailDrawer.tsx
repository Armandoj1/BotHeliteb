import { Badge, Button, Drawer, Separator } from '@/components/ui';
import {
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUS_TONES,
  describeSentiment,
} from '@/features/conversations/labels';
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
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="primary" size="sm">
            Abrir en Chat
          </Button>
        </>
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

          <MessageThread messages={conversation.messages} className="flex-1 bg-surface-sunken/40" />
        </div>
      ) : null}
    </Drawer>
  );
}
