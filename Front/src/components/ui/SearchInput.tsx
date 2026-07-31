import { Search, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Input } from './Input';

export interface ISearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

/** Presentational search field — debouncing belongs to the consuming hook. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
  ...aria
}: ISearchInputProps) {
  return (
    <Input
      type="search"
      role="searchbox"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={aria['aria-label'] ?? placeholder}
      className={cn('[&::-webkit-search-cancel-button]:hidden', className)}
      leading={<Search />}
      trailing={
        value ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => onChange('')}
            className="grid size-6 place-items-center rounded-md transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : undefined
      }
    />
  );
}
