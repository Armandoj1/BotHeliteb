import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useId, type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { TRANSITION } from '@/lib/motion';
import { Label } from './Label';

export interface IFormFieldProps {
  label: string;
  /** Receives the generated ids so any control can be wired up accessibly. */
  children: (ids: { id: string; describedBy: string | undefined }) => ReactElement;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  /** Slot on the right of the label row (docs link, reveal toggle…). */
  action?: ReactNode;
  className?: string;
}

/**
 * Owns label/hint/error wiring so no form ever re-implements `aria-describedby`.
 * The render-prop keeps it control-agnostic: input, select, textarea, anything.
 */
export function FormField({
  label,
  children,
  hint,
  error,
  optional = false,
  action,
  className,
}: IFormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} optional={optional}>
          {label}
        </Label>
        {action}
      </div>

      {children({ id, describedBy: describedBy || undefined })}

      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={TRANSITION.fast}
            className="flex items-center gap-1.5 text-[12px] text-danger"
          >
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={hintId} className="text-[12px] leading-relaxed text-subtle">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
