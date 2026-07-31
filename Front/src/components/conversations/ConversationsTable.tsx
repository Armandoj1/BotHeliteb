import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui';
import {
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUS_TONES,
  describeSentiment,
} from '@/features/conversations/labels';
import type { IConversation } from '@/types';
import { formatRelativeTime } from '@/utils/format-date';
import { stripBold } from '@/utils/rich-text';
import { ChannelIcon } from './ChannelIcon';

export interface IConversationsTableProps {
  conversations: readonly IConversation[];
  onSelect: (conversation: IConversation) => void;
}

export function ConversationsTable({ conversations, onSelect }: IConversationsTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contacto</TableHead>
            <TableHead>Último mensaje</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Sentimiento</TableHead>
            <TableHead>Asignada a</TableHead>
            <TableHead align="right">Actividad</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {conversations.map((conversation) => {
            const sentiment = describeSentiment(conversation.sentiment);

            return (
              <TableRow
                key={conversation.id}
                interactive
                tabIndex={0}
                role="button"
                aria-label={`Abrir conversación con ${conversation.contactName}`}
                onClick={() => onSelect(conversation)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(conversation);
                  }
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {conversation.unread > 0 ? (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-primary"
                        aria-label={`${conversation.unread} mensajes sin leer`}
                      />
                    ) : (
                      <span className="size-1.5 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {conversation.contactName}
                      </p>
                      <p className="truncate text-[12px] text-subtle">{conversation.reference}</p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="max-w-xs">
                  {/* One truncated line: the markers are noise, not emphasis. */}
                  <p className="truncate text-muted">{stripBold(conversation.lastMessage)}</p>
                </TableCell>

                <TableCell>
                  <ChannelIcon channel={conversation.channel} withLabel />
                </TableCell>

                <TableCell>
                  <Badge tone={CONVERSATION_STATUS_TONES[conversation.status]} withDot>
                    {CONVERSATION_STATUS_LABELS[conversation.status]}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge tone={sentiment.tone}>{sentiment.label}</Badge>
                </TableCell>

                <TableCell className="text-muted">{conversation.assignedTo}</TableCell>

                <TableCell align="right" className="whitespace-nowrap text-subtle">
                  {formatRelativeTime(conversation.lastMessageAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
