import { AtSign, Camera, MessageCircle, Monitor, Send, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';
import { CHANNEL_LABELS } from '@/features/conversations/labels';
import type { ChannelType } from '@/types';

const CHANNEL_ICONS: Record<ChannelType, LucideIcon> = {
  whatsapp: MessageCircle,
  webchat: Monitor,
  email: AtSign,
  instagram: Camera,
  telegram: Send,
};

export interface IChannelIconProps {
  channel: ChannelType;
  className?: string;
  /** Renders the channel name next to the glyph. */
  withLabel?: boolean;
}

export function ChannelIcon({ channel, className, withLabel = false }: IChannelIconProps) {
  const Icon = CHANNEL_ICONS[channel];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-muted', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {withLabel ? <span className="truncate">{CHANNEL_LABELS[channel]}</span> : null}
      {withLabel ? null : <span className="sr-only">{CHANNEL_LABELS[channel]}</span>}
    </span>
  );
}
