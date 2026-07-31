import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface ITooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipPrimitive.TooltipContentProps['side'];
  align?: TooltipPrimitive.TooltipContentProps['align'];
  /** Suppresses the tooltip without unmounting the trigger (e.g. expanded sidebar). */
  disabled?: boolean;
  delayDuration?: number;
}

export function Tooltip({
  content,
  children,
  side = 'right',
  align = 'center',
  disabled = false,
  delayDuration = 240,
}: ITooltipProps) {
  if (disabled) return <>{children}</>;

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          className={cn(
            'pop-surface z-[60] max-w-[16rem] rounded-md border border-border bg-elevated px-2.5 py-1.5',
            'text-[12px] leading-snug text-foreground shadow-md',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** Mount once near the root of an island; required by every `<Tooltip>`. */
export const TooltipProvider = TooltipPrimitive.Provider;
