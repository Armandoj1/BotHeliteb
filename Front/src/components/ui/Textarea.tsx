import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface ITextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, ITextareaProps>(function Textarea(
  { className, invalid = false, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full resize-y rounded-md border bg-surface px-3 py-2 text-[13px] leading-relaxed text-foreground',
        'placeholder:text-subtle',
        'transition-[border-color,box-shadow] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle',
        invalid
          ? 'border-danger focus-visible:border-danger focus-visible:ring-[color-mix(in_srgb,var(--danger)_28%,transparent)]'
          : 'border-border focus-visible:border-primary focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  );
});
