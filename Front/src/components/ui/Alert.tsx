import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type AlertToneType = 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<AlertToneType, string> = {
  info: 'border-primary/20 bg-primary-tint',
  success: 'border-success/25 bg-success-tint',
  warning: 'border-warning/25 bg-warning-tint',
  danger: 'border-danger/25 bg-danger-tint',
};

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

const ICON_TONES = {
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export interface IAlertProps extends HTMLAttributes<HTMLDivElement> {
  tone: AlertToneType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function Alert({ className, tone, title, description, action, ...props }: IAlertProps) {
  const Icon = ICONS[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-lg border p-3.5 text-foreground',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      <Icon className={cn('mt-px size-4 shrink-0', ICON_TONES[tone])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {description ? (
          <div className="mt-1 text-[13px] leading-relaxed text-muted">{description}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
