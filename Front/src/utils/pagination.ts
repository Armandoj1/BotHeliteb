export type PageEntryType = number | 'ellipsis';

/**
 * Produces a compact page list (`1 … 4 5 6 … 20`) with a stable width so the
 * pagination bar never reflows while paging.
 */
export function buildPageRange(current: number, totalPages: number, siblings = 1): PageEntryType[] {
  const maxSlots = siblings * 2 + 5;

  if (totalPages <= maxSlots) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, totalPages);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < totalPages - 1;

  const pages: PageEntryType[] = [1];
  if (showLeftEllipsis) pages.push('ellipsis');

  for (let page = Math.max(left, 2); page <= Math.min(right, totalPages - 1); page += 1) {
    pages.push(page);
  }

  if (showRightEllipsis) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}
