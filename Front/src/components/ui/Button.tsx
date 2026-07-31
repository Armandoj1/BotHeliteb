import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium tracking-[-0.01em]',
    'transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
    'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-active',
        secondary:
          'border border-border bg-surface text-foreground shadow-xs hover:border-border-strong hover:bg-surface-muted',
        ghost: 'text-muted hover:bg-surface-muted hover:text-foreground',
        subtle: 'bg-primary-tint text-primary hover:bg-primary-tint-strong',
        danger: 'bg-danger text-white shadow-xs hover:opacity-90',
        'danger-ghost': 'text-danger hover:bg-danger-tint',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-2.5 text-[13px] [&_svg]:size-3.5',
        md: 'h-9 px-3.5 text-[13px] [&_svg]:size-4',
        lg: 'h-10 px-4 text-sm [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-3.5',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', block: false },
  },
);

export interface IButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renders the child element instead of a `<button>` (links, menu items). */
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, IButtonProps>(function Button(
  {
    className,
    variant,
    size,
    block,
    asChild = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </Component>
  );
});

export { buttonVariants };
