import { Card, Skeleton } from '@/components/ui';

/** Mirrors the real card's geometry so the swap to loaded content is silent. */
export function ProviderCardSkeleton() {
  return (
    <Card elevation="raised" className="overflow-hidden">
      <div className="flex items-start gap-3.5 px-5 pb-4 pt-5">
        <Skeleton shape="block" className="size-10 rounded-[12px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-full max-w-sm" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <Skeleton shape="block" className="h-[62px] sm:col-span-2" />
        <Skeleton shape="block" className="h-[62px]" />
        <Skeleton shape="block" className="h-[62px]" />
      </div>

      <div className="flex items-center justify-between border-t border-border bg-surface-sunken/60 px-5 py-3.5">
        <Skeleton className="h-2.5 w-36" />
        <div className="flex gap-2">
          <Skeleton shape="block" className="h-8 w-24" />
          <Skeleton shape="block" className="h-8 w-32" />
        </div>
      </div>
    </Card>
  );
}
