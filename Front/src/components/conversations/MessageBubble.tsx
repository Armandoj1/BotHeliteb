import { motion } from 'framer-motion';

import { Sparkles } from 'lucide-react';

import { renderBold } from '@/components/common/RichText';
import { cn } from '@/lib/cn';
import { staggerItem } from '@/lib/motion';
import type { IMessage } from '@/types';
import { formatTime } from '@/utils/format-date';

export interface IMessageBubbleProps {
  message: IMessage;
}

/** System notices read as annotations; everyone else gets a bubble. */
export function MessageBubble({ message }: IMessageBubbleProps) {
  if (message.author === 'system') {
    return (
      <motion.li variants={staggerItem} className="flex justify-center py-1">
        <p className="rounded-full bg-surface-muted px-3 py-1 text-[11px] text-subtle">
          {renderBold(message.content)}
        </p>
      </motion.li>
    );
  }

  const isOutbound = message.author === 'agent' || message.author === 'assistant';

  return (
    <motion.li
      variants={staggerItem}
      className={cn('flex flex-col gap-1', isOutbound ? 'items-end' : 'items-start')}
    >
      <div
        className={cn(
          'max-w-[min(34rem,86%)] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed',
          isOutbound
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm border border-border bg-surface text-foreground',
        )}
      >
        {renderBold(message.content)}
      </div>

      <div className="flex items-center gap-1.5 px-1 text-[11px] text-subtle">
        {message.author === 'assistant' ? (
          <Sparkles className="size-3 text-primary" aria-hidden />
        ) : null}
        <span>{message.authorName}</span>
        <span aria-hidden>·</span>
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
        {message.model ? (
          <>
            <span aria-hidden>·</span>
            <span className="font-mono">{message.model}</span>
          </>
        ) : null}
      </div>
    </motion.li>
  );
}
