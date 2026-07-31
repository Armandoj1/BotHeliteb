import { NAV_GROUPS } from '@/constants/navigation';
import { isRouteActive } from '@/utils/route';
import { SidebarNavItem } from './SidebarNavItem';

export interface ISidebarNavProps {
  pathname: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ pathname, isCollapsed, onNavigate }: ISidebarNavProps) {
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-5 px-3 py-2 rail:gap-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 select-none truncate px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle rail:hidden">
            {group.label}
          </p>

          {/* Keeps the rhythm between groups once their labels are gone. */}
          <span className="mb-2 hidden h-px bg-border rail:mx-4 rail:block" aria-hidden />


          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
