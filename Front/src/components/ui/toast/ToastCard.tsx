import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { TRANSITION } from '@/lib/motion';
import type { IToast } from '@/store/toast.store';

const ICONS = {
  neutral: Info,
  primary: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

const ICON_TONES = {
  neutral: 'text-subtle',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export interface IToastCardProps {
  toast: IToast;
  onDismiss: (id: string) => void;
}

export function ToastCard({ toast, onDismiss }: IToastCardProps) {
  const Icon = ICONS[toast.tone];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97, transition: TRANSITION.fast }}
      transition={TRANSITION.spring}
      className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-elevated shadow-lg"
    >
      <div className="flex items-start gap-3 p-3.5">
        <Icon className={cn('mt-px size-4 shrink-0', ICON_TONES[toast.tone])} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Descartar notificación"
          onClick={() => onDismiss(toast.id)}
          className="-mr-1 -mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* Time-remaining affordance — purely decorative, never the only signal. */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        style={{ transformOrigin: 'left' }}
        className={cn(
          'h-0.5 w-full',
          toast.tone === 'success' && 'bg-success',
          toast.tone === 'danger' && 'bg-danger',
          toast.tone === 'warning' && 'bg-warning',
          (toast.tone === 'primary' || toast.tone === 'neutral') && 'bg-primary',
        )}
        aria-hidden
      />
    </motion.li>
  );
}
