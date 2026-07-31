import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

import { cn } from '@/lib/cn';
import type { IBreadcrumbItem } from '@/types';

export interface IBreadcrumbProps {
  items: readonly IBreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: IBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Ruta de navegación" className={cn('min-w-0', className)}>
      <ol className="flex items-center gap-1.5 text-[12px] text-subtle">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="min-w-0">
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="truncate rounded-xs transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    className={cn('truncate', isLast && 'font-medium text-muted')}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {isLast ? null : (
                <li aria-hidden className="text-border-strong">
                  <ChevronRight className="size-3" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
