import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const cardVariants = cva('rounded-xl bg-surface', {
  variants: {
    elevation: {
      flat: 'border border-border',
      raised: 'border border-border shadow-sm',
      floating: 'border border-border shadow-md',
    },
    interactive: {
      true: 'transition-[box-shadow,border-color,transform] duration-200 ease-out hover:border-border-strong hover:shadow-md',
      false: '',
    },
  },
  defaultVariants: { elevation: 'raised', interactive: false },
});

export interface ICardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, ICardProps>(function Card(
  { className, elevation, interactive, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ elevation, interactive }), className)}
      {...props}
    />
  );
});

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 px-5 pb-4 pt-5', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[15px] font-semibold text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-[13px] leading-relaxed text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sunken/60 px-5 py-3.5',
        className,
      )}
      {...props}
    />
  );
}
