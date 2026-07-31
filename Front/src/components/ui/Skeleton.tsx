import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface ISkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Matches the shape of the content being loaded. */
  shape?: 'line' | 'block' | 'circle';
}

export function Skeleton({ className, shape = 'line', ...props }: ISkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'skeleton-sheen bg-surface-muted',
        shape === 'line' && 'h-3 rounded-full',
        shape === 'block' && 'rounded-md',
        shape === 'circle' && 'rounded-full',
        className,
      )}
      {...props}
    />
  );
}

