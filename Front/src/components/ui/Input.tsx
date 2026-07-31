import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

const inputVariants = cva(
  [
    'w-full rounded-md border bg-surface text-[13px] text-foreground',
    'placeholder:text-subtle',
    'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-[3px]',
    'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle',
    'read-only:bg-surface-muted',
  ],
  {
    variants: {
      tone: {
        default: 'border-border focus-visible:border-primary focus-visible:ring-ring',
        invalid:
          'border-danger focus-visible:border-danger focus-visible:ring-[color-mix(in_srgb,var(--danger)_28%,transparent)]',
        success: 'border-success focus-visible:border-success focus-visible:ring-ring',
      },
      inputSize: {
        sm: 'h-8 px-2.5',
        md: 'h-9 px-3',
        lg: 'h-10 px-3.5 text-sm',
      },
      hasLeading: { true: 'pl-9', false: '' },
      hasTrailing: { true: 'pr-9', false: '' },
    },
    defaultVariants: { tone: 'default', inputSize: 'md', hasLeading: false, hasTrailing: false },
  },
);

export interface IInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    Pick<VariantProps<typeof inputVariants>, 'tone' | 'inputSize'> {
  /** Decorative icon rendered inside the field on the leading edge. */
  leading?: ReactNode;
  /** Interactive slot (reveal toggle, clear button) on the trailing edge. */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, IInputProps>(function Input(
  { className, tone, inputSize, leading, trailing, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      className={cn(
        inputVariants({
          tone,
          inputSize,
          hasLeading: Boolean(leading),
          hasTrailing: Boolean(trailing),
        }),
        className,
      )}
      {...props}
    />
  );

  if (!leading && !trailing) return field;

  return (
    <div className="relative w-full">
      {leading ? (
        <span
          className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-subtle [&_svg]:size-4"
          aria-hidden
        >
          {leading}
        </span>
      ) : null}
      {field}
      {trailing ? (
        <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center text-subtle">
          {trailing}
        </span>
      ) : null}
    </div>
  );
});

export { inputVariants };
