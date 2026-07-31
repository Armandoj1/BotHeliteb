import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { fadeInUp } from '@/lib/motion';

export interface IPageHeaderProps {
  title: string;
  description?: string;
  /** Buttons or filters aligned to the trailing edge. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: IPageHeaderProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn('flex flex-wrap items-end justify-between gap-4', className)}
    >
      <div className="min-w-0">
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </motion.div>
  );
}
