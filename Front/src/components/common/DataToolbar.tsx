import type { ReactNode } from 'react';

import { SearchInput } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface IDataToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (selects, toggles) rendered next to the search field. */
  filters?: ReactNode;
  /** Primary actions aligned to the trailing edge. */
  actions?: ReactNode;
  className?: string;
}

/** Search + filters + actions row shared by every list screen. */
export function DataToolbar({
  query,
  onQueryChange,
  searchPlaceholder = 'Buscar…',
  filters,
  actions,
  className,
}: IDataToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={searchPlaceholder}
        className="w-full sm:w-64"
      />

      {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div> : null}
    </div>
  );
}
