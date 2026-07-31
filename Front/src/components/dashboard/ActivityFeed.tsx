import { motion } from 'framer-motion';
import {
  MessageSquare,
  PlugZap,
  ReceiptText,
  RefreshCcw,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { staggerContainer, staggerItem } from '@/lib/motion';
import type { ActivityKindType, IActivityEntry } from '@/types';
import { formatRelativeTime } from '@/utils/format-date';

const KIND_ICONS: Record<ActivityKindType, LucideIcon> = {
  conversation: MessageSquare,
  quotation: ReceiptText,
  sync: RefreshCcw,
  provider: PlugZap,
  advisor: UserRoundPlus,
};

export interface IActivityFeedProps {
  entries: readonly IActivityEntry[];
}

export function ActivityFeed({ entries }: IActivityFeedProps) {
  return (
    <Card className="p-0">
      <CardHeader>
        <div>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Eventos del espacio de trabajo en tiempo real</CardDescription>
        </div>
      </CardHeader>

      <motion.ol
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="px-5 pb-5"
      >
        {entries.map((entry, index) => {
          const Icon = KIND_ICONS[entry.kind];
          const isLast = index === entries.length - 1;

          return (
            <motion.li key={entry.id} variants={staggerItem} className="relative flex gap-3 pb-5">
              {/* Timeline spine, drawn per item so the last one stops cleanly. */}
              {isLast ? null : (
                <span
                  className="absolute left-[13px] top-8 h-[calc(100%-1.5rem)] w-px bg-border"
                  aria-hidden
                />
              )}

              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-subtle">
                <Icon className="size-3.5" aria-hidden />
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-medium leading-snug text-foreground">{entry.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{entry.description}</p>
                <p className="mt-1 text-[11px] text-subtle">
                  {entry.actor} · {formatRelativeTime(entry.createdAt)}
                </p>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </Card>
  );
}
