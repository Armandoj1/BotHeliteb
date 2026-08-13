import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { scaleIn } from '@/lib/motion';
import { DialogOverlay } from './internal/DialogOverlay';

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

export type DialogSizeType = keyof typeof SIZE_CLASSES;

export interface IDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: DialogSizeType;
  children?: ReactNode;
  /** Action row pinned to the bottom of the surface. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Centered modal surface. Controlled by design so the exit animation can play
 * before Radix unmounts the portal.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
}: IDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogOverlay />
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-2rem)] flex-col -translate-x-1/2 -translate-y-1/2',
                  // Sin tope de altura, un formulario largo empuja el pie fuera
                  // de la pantalla y deja el modal inservible.
                  'max-h-[calc(100dvh-2rem)]',
                  'overflow-hidden rounded-xl border border-border bg-elevated shadow-xl focus:outline-none',
                  SIZE_CLASSES[size],
                  className,
                )}
              >
                <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-5">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="text-[15px] font-semibold text-foreground">
                      {title}
                    </DialogPrimitive.Title>
                    {description ? (
                      <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-muted">
                        {description}
                      </DialogPrimitive.Description>
                    ) : null}
                  </div>
                  <DialogPrimitive.Close
                    aria-label="Cerrar"
                    className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    <X className="size-4" aria-hidden />
                  </DialogPrimitive.Close>
                </header>

                {children ? (
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 text-[13px] text-muted">
                    {children}
                  </div>
                ) : null}

                {footer ? (
                  <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface-sunken/60 px-5 py-3.5">
                    {footer}
                  </div>
                ) : null}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
