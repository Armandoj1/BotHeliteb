import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';

import { cn } from '@/lib/cn';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 8, align = 'end', ...props }, ref) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'pop-surface z-[60] min-w-[13rem] overflow-hidden rounded-lg border border-border bg-elevated p-1 shadow-lg',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  ComponentRef<typeof DropdownPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }
>(function DropdownMenuItem({ className, destructive = false, ...props }, ref) {
  return (
    <DropdownPrimitive.Item
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none',
        'transition-colors duration-100',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-subtle',
        destructive
          ? 'text-danger data-[highlighted]:bg-danger-tint [&_svg]:text-danger'
          : 'text-foreground data-[highlighted]:bg-surface-muted',
        className,
      )}
      {...props}
    />
  );
});

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn('px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-subtle', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
  );
}

/** Trailing keyboard hint aligned to the right edge of a menu item. */
export function DropdownMenuShortcut({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      className={cn('ml-auto font-mono text-[11px] tracking-wide text-subtle', className)}
      {...props}
    />
  );
}
