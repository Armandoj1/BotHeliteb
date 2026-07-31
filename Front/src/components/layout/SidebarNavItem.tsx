import { motion } from 'framer-motion';

import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TRANSITION } from '@/lib/motion';
import type { INavItem } from '@/types';

export interface ISidebarNavItemProps {
  item: INavItem;
  isActive: boolean;
  /** Collapsed rail promotes the label into a tooltip. */
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarNavItem({ item, isActive, isCollapsed, onNavigate }: ISidebarNavItemProps) {
  const Icon = item.icon;

  return (
    <li className="relative">
      <Tooltip
        content={
          <div>
            <p className="font-medium">{item.label}</p>
            <p className="mt-0.5 text-subtle">{item.description}</p>
          </div>
        }
        side="right"
        disabled={!isCollapsed}
      >
        <a
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'group relative flex h-9 items-center gap-2.5 overflow-hidden rounded-md px-2.5',
            'text-[13px] transition-colors duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
            isActive
              ? 'text-primary'
              : 'text-muted hover:bg-surface-muted hover:text-foreground',
            'rail:justify-center rail:px-0',
          )}
        >
          {isActive ? (
            <motion.span
              layoutId="sidebar-active-pill"
              transition={TRANSITION.spring}
              className="absolute inset-0 -z-10 rounded-md bg-primary-tint"
              aria-hidden
            />
          ) : null}

          <Icon
            className={cn(
              'size-[18px] shrink-0 transition-transform duration-200',
              !isActive && 'group-hover:scale-105',
            )}
            aria-hidden
          />

          {/* Removed from flow (not just faded) so the icon can truly centre. */}
          <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-medium', 'rail:hidden')}>
            {item.label}
          </span>

          {item.badge ? (
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-opacity duration-200',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-subtle',
                'rail:hidden',
              )}
              data-numeric
            >
              {item.badge}
            </span>
          ) : null}
        </a>
      </Tooltip>
    </li>
  );
}
