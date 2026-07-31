import { Skeleton } from '@/components/ui';

/** Matches the loaded layout one-to-one so nothing shifts when data lands. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} shape="block" className="h-[172px]" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton shape="block" className="h-[352px] lg:col-span-2" />
        <Skeleton shape="block" className="h-[352px]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton shape="block" className="h-[352px] lg:col-span-2" />
        <Skeleton shape="block" className="h-[352px]" />
      </div>
    </div>
  );
}
