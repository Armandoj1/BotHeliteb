import type { IPaginatedResult } from '@/types';

/** Pure, client-side pagination used by every table until a real API takes over. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): IPaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/** Case/accent-insensitive match across the given fields. */
export function matchesQuery<T>(item: T, query: string, fields: ReadonlyArray<keyof T>): boolean {
  const needle = normalizeText(query);
  if (!needle) return true;

  return fields.some((field) => normalizeText(String(item[field] ?? '')).includes(needle));
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function sumBy<T>(items: readonly T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}
