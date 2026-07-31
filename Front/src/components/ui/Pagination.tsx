import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { buildPageRange } from '@/utils/pagination';
import { Button } from './Button';

export interface IPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: IPaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3',
        className,
      )}
    >
      <p className="text-[12px] text-muted" data-numeric>
        {from}–{to} de {total}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>

        {buildPageRange(page, totalPages).map((entry, index) =>
          entry === 'ellipsis' ? (
            <span key={`gap-${index}`} className="px-1.5 text-[13px] text-subtle" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === page ? 'subtle' : 'ghost'}
              size="icon-sm"
              aria-label={`Página ${entry}`}
              aria-current={entry === page ? 'page' : undefined}
              onClick={() => onPageChange(entry)}
            >
              <span data-numeric>{entry}</span>
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Página siguiente"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
