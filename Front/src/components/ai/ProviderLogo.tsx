import { cn } from '@/lib/cn';
import type { IProviderDefinition } from '@/types';

const SIZE_CLASSES = {
  sm: 'size-8 text-[13px] rounded-lg',
  md: 'size-10 text-[15px] rounded-[12px]',
} as const;

export interface IProviderLogoProps {
  definition: Pick<IProviderDefinition, 'name' | 'accent'>;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/**
 * Vendor mark rendered from the brand hue instead of bundling logo assets:
 * consistent geometry, perfect crispness, zero licensing questions.
 */
export function ProviderLogo({ definition, size = 'md', className }: IProviderLogoProps) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center font-semibold', SIZE_CLASSES[size], className)}
      style={{
        color: definition.accent,
        backgroundColor: `color-mix(in srgb, ${definition.accent} 12%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${definition.accent} 22%, transparent)`,
      }}
    >
      {definition.name.charAt(0)}
    </span>
  );
}
