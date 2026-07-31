import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium tracking-[-0.005em]',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-muted',
        primary: 'bg-primary-tint text-primary',
        success: 'bg-success-tint text-success',
        warning: 'bg-warning-tint text-warning',
        danger: 'bg-danger-tint text-danger',
        outline: 'border border-border text-muted',
      },
      size: {
        sm: 'h-5 px-2 text-[11px]',
        md: 'h-6 px-2.5 text-[12px]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
);

export interface IBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Renders a leading status dot inheriting the badge tone. */
  withDot?: boolean;
}

export function Badge({ className, tone, size, withDot = false, children, ...props }: IBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {withDot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export { badgeVariants };
