import { NAV_GROUPS, NAV_ITEMS } from '@/constants/navigation';
import type { IBreadcrumbItem, INavItem } from '@/types';

/** Normalises trailing slashes so `/chat` and `/chat/` behave identically. */
function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export function isRouteActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === '/') return current === '/';
  return current === target || current.startsWith(`${target}/`);
}

/** Resolves the nav entry that owns the current URL — powers header titles. */
export function findActiveNavItem(pathname: string): INavItem | undefined {
  return NAV_ITEMS.find((item) => isRouteActive(pathname, item.href));
}

/**
 * Breadcrumbs are derived from the navigation tree rather than declared per
 * page, so a module can never show a trail that contradicts the sidebar.
 */
export function buildBreadcrumbs(pathname: string): IBreadcrumbItem[] {
  const item = findActiveNavItem(pathname);
  if (!item) return [];

  const group = NAV_GROUPS.find((candidate) => candidate.id === item.group);
  if (!group || item.href === '/') return [{ label: item.label }];

  return [{ label: group.label }, { label: item.label }];
}
