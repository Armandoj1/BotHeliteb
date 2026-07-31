import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { fadeInUp } from '@/lib/motion';

export interface IEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** `inline` fits inside cards and tables, `page` centers in a full section. */
  variant?: 'inline' | 'page';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'inline',
  className,
}: IEmptyStateProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        variant === 'inline' ? 'py-12' : 'py-24',
        className,
      )}
    >
      <div className="grid size-11 place-items-center rounded-xl border border-border bg-surface-muted text-subtle">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-[14px] font-medium text-foreground">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}
