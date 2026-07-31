import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '@/lib/cn';

const SIZE_CLASSES = {
  sm: 'size-7 text-[11px]',
  md: 'size-8 text-[12px]',
  lg: 'size-10 text-[13px]',
} as const;

export interface IAvatarProps {
  name: string;
  initials: string;
  src?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Avatar({ name, initials, src, size = 'md', className }: IAvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 select-none overflow-hidden rounded-full border border-border',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 200 : 0}
        className="grid size-full place-items-center bg-surface-muted font-medium text-muted"
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
