import { cn } from '@/lib/cn';
import type { ToneType } from '@/types';

export interface IStatusDotProps {
  tone: ToneType;
  /** Adds a breathing halo for in-progress states. */
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const TONE_CLASSES: Record<ToneType, string> = {
  neutral: 'bg-subtle',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const HALO_CLASSES: Record<ToneType, string> = {
  neutral: 'bg-subtle/30',
  primary: 'bg-primary/30',
  success: 'bg-success/30',
  warning: 'bg-warning/30',
  danger: 'bg-danger/30',
};

/** The single visual language for "is this thing alive" across the product. */
export function StatusDot({ tone, pulse = false, size = 'md', className }: IStatusDotProps) {
  const dotSize = size === 'sm' ? 'size-1.5' : 'size-2';

  return (
    <span className={cn('relative inline-flex shrink-0', dotSize, className)} aria-hidden>
      {pulse ? (
        <span
          className={cn(
            'absolute inline-flex size-full animate-ping rounded-full opacity-75',
            HALO_CLASSES[tone],
          )}
        />
      ) : null}
      <span className={cn('relative inline-flex size-full rounded-full', TONE_CLASSES[tone])} />
    </span>
  );
}
