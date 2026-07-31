import { motion } from 'framer-motion';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  NOTE_SCOPE_LABELS,
  NOTE_STATUS_LABELS,
  NOTE_STATUS_TONES,
} from '@/features/notes/labels';
import { staggerItem } from '@/lib/motion';
import type { IAgentNote } from '@/types';
import { formatRelativeTime } from '@/utils/format-date';

export interface INoteCardProps {
  note: IAgentNote;
  onEdit: (note: IAgentNote) => void;
  onDelete: (note: IAgentNote) => void;
}

export function NoteCard({ note, onEdit, onDelete }: INoteCardProps) {
  return (
    <motion.article variants={staggerItem} className="h-full">
      <Card interactive className="flex h-full flex-col p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-foreground">{note.title}</h3>
            <p className="mt-0.5 text-[11px] text-subtle">
              {note.author} · {formatRelativeTime(note.updatedAt)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones para ${note.title}`}
                className="-mr-1 -mt-1"
              >
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onEdit(note)}>
                <Pencil aria-hidden />
                Editar nota
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => onDelete(note)}>
                <Trash2 aria-hidden />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <p className="mt-3 line-clamp-4 flex-1 text-[13px] leading-relaxed text-muted">
          {note.content}
        </p>

        <footer className="mt-4 flex flex-wrap items-center gap-1.5">
          <Badge tone={NOTE_STATUS_TONES[note.status]} withDot>
            {NOTE_STATUS_LABELS[note.status]}
          </Badge>
          <Badge tone="outline">{NOTE_SCOPE_LABELS[note.scope]}</Badge>
          <Badge tone="neutral">
            Prioridad <span data-numeric>{note.priority}</span>
          </Badge>
        </footer>
      </Card>
    </motion.article>
  );
}
