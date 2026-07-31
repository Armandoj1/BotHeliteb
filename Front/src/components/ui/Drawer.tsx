import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { slideInLeft, slideInRight } from '@/lib/motion';
import { DialogOverlay } from './internal/DialogOverlay';

export type DrawerSideType = 'left' | 'right';

export interface IDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: DrawerSideType;
  title: string;
  description?: string;
  /** Hides the visual header while keeping the accessible name. */
  hideHeader?: boolean;
  width?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Edge-anchored sheet used for mobile navigation and record detail panels. */
export function Drawer({
  open,
  onOpenChange,
  side = 'right',
  title,
  description,
  hideHeader = false,
  width = 'w-[min(24rem,88vw)]',
  children,
  footer,
  className,
}: IDrawerProps) {
  const variants = side === 'right' ? slideInRight : slideInLeft;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogOverlay />
            <DialogPrimitive.Content asChild forceMount>
              <motion.aside
                variants={variants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  'fixed inset-y-0 z-50 flex flex-col border-border bg-surface shadow-xl focus:outline-none',
                  side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
                  width,
                  className,
                )}
              >
                {/* The accessible name is always mounted; only its presentation changes. */}
                {hideHeader ? (
                  <div className="sr-only">
                    <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
                    {description ? (
                      <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
                    ) : null}
                  </div>
                ) : (
                  <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                    <div className="min-w-0">
                      <DialogPrimitive.Title className="truncate text-[15px] font-semibold text-foreground">
                        {title}
                      </DialogPrimitive.Title>
                      {description ? (
                        <DialogPrimitive.Description className="mt-0.5 truncate text-[13px] text-muted">
                          {description}
                        </DialogPrimitive.Description>
                      ) : null}
                    </div>
                    <DialogPrimitive.Close
                      aria-label="Cerrar"
                      className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      <X className="size-4" aria-hidden />
                    </DialogPrimitive.Close>
                  </header>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

                {footer ? (
                  <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
                    {footer}
                  </div>
                ) : null}
              </motion.aside>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
