import * as LabelPrimitive from '@radix-ui/react-label';
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';

import { cn } from '@/lib/cn';

export interface ILabelProps extends ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Appends the muted "opcional" marker instead of a required asterisk. */
  optional?: boolean;
}

export const Label = forwardRef<ComponentRef<typeof LabelPrimitive.Root>, ILabelProps>(function Label(
  { className, optional = false, children, ...props },
  ref,
) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
      {optional ? <span className="text-[11px] font-normal text-subtle">opcional</span> : null}
    </LabelPrimitive.Root>
  );
});
