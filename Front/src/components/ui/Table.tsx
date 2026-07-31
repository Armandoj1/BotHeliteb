import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/** Composable table primitives. Feature tables assemble these — no generic
 *  "do-everything" DataTable that every screen has to fight against. */

export function TableWrapper({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('w-full overflow-x-auto overscroll-x-contain', className)}
      role="region"
      tabIndex={0}
      {...props}
    />
  );
}

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(function Table(
  { className, ...props },
  ref,
) {
  return (
    <table
      ref={ref}
      className={cn('w-full border-collapse text-left text-[13px]', className)}
      {...props}
    />
  );
});

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border', className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export interface ITableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
  selected?: boolean;
}

export function TableRow({ className, interactive, selected, ...props }: ITableRowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        'transition-colors duration-150',
        interactive && 'cursor-pointer hover:bg-surface-muted/70',
        selected && 'bg-primary-tint/60',
        className,
      )}
      {...props}
    />
  );
}

export interface ITableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right' | 'center';
}

export function TableHead({ className, align = 'left', ...props }: ITableHeadProps) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-subtle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  );
}

export interface ITableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right' | 'center';
}

export function TableCell({ className, align = 'left', ...props }: ITableCellProps) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-foreground',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  );
}
