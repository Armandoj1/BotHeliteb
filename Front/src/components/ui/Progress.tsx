import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { TRANSITION } from '@/lib/motion';

export interface IProgressProps {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  label?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const TONE_CLASSES = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
} as const;

export function Progress({ value, label, tone = 'primary', className }: IProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <motion.div
        className={cn('h-full rounded-full', TONE_CLASSES[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={TRANSITION.slow}
      />
    </div>
  );
}
