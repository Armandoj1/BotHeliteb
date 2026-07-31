import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';
import { staggerItem } from '@/lib/motion';
import type { ToneType } from '@/types';

const TONE_CLASSES: Record<ToneType, string> = {
  neutral: 'bg-surface-muted text-muted',
  primary: 'bg-primary-tint text-primary',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
};

export interface IStatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: ToneType;
  className?: string;
}

/** Compact single-number tile. The dashboard uses `MetricCard` for trended data. */
export function StatTile({ label, value, hint, icon: Icon, tone = 'neutral', className }: IStatTileProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={cn('rounded-xl border border-border bg-surface p-4', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', TONE_CLASSES[tone])}>
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>

      <p
        className="mt-3 text-[24px] font-semibold leading-none tracking-[-0.03em] text-foreground"
        data-numeric
      >
        {value}
      </p>

      {hint ? <p className="mt-1.5 text-[12px] text-subtle">{hint}</p> : null}
    </motion.div>
  );
}
