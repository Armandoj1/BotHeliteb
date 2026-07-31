import { cn } from '@/lib/cn';

export interface IBrandMarkProps {
  className?: string;
}

/** Geometric monogram — no external asset, scales crisply at any size. */
export function BrandMark({ className }: IBrandMarkProps) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-[10px] bg-foreground text-background',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]">
        <path
          d="M6 18V6l12 12V6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
