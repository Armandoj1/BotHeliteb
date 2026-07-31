import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';
import { staggerContainer } from '@/lib/motion';
import type { IMessage } from '@/types';
import { formatDate } from '@/utils/format-date';
import { MessageBubble } from './MessageBubble';

export interface IMessageThreadProps {
  messages: readonly IMessage[];
  className?: string;
}

/** Scrollable transcript that keeps the newest message in view. */
export function MessageThread({ messages, className }: IMessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const firstDate = messages[0]?.createdAt;

  return (
    <div className={cn('min-h-0 overflow-y-auto px-4 py-4', className)}>
      {firstDate ? (
        <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-wider text-subtle">
          {formatDate(firstDate)}
        </p>
      ) : null}

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-3.5"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </motion.ul>

      <div ref={bottomRef} />
    </div>
  );
}
