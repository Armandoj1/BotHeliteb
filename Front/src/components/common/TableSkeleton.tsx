import { Skeleton } from '@/components/ui';

export interface ITableSkeletonProps {
  rows?: number;
  columns?: number;
}

/** Generic table placeholder used by every list screen. */
export function TableSkeleton({ rows = 6, columns = 5 }: ITableSkeletonProps) {
  return (
    <div className="divide-y divide-border">
      <div className="flex gap-4 px-4 py-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-2.5 flex-1" />
        ))}
      </div>

      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={columnIndex === 0 ? 'h-3 flex-[1.4]' : 'h-3 flex-1'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
