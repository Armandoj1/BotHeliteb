import type { LucideIcon } from 'lucide-react';

export type NavGroupIdType = 'workspace' | 'commercial' | 'platform';

export interface INavItem {
  /** Stable key used for active-state matching and analytics. */
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short helper shown in the collapsed-sidebar tooltip. */
  description: string;
  badge?: string;
  group: NavGroupIdType;
}

export interface INavGroup {
  id: NavGroupIdType;
  label: string;
  items: INavItem[];
}

export interface IBreadcrumbItem {
  label: string;
  href?: string;
}
