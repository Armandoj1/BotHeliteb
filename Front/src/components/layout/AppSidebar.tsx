import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Drawer, Tooltip, TooltipProvider } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePathname } from '@/hooks/usePathname';
import { useShellState } from '@/hooks/useShellState';
import { cn } from '@/lib/cn';
import { SidebarContent } from './SidebarContent';

export interface IAppSidebarProps {
  /** Route at first render; kept current by `usePathname` afterwards. */
  pathname: string;
}

/**
 * Island root for navigation, in three progressive forms:
 *
 *  - `≥ lg`  full sidebar, collapsible to a rail by the user;
 *  - `md–lg` rail only, so navigation survives narrow windows and browser zoom;
 *  - `< md`  drawer opened from the header.
 */
export function AppSidebar({ pathname: initialPathname }: IAppSidebarProps) {
  const pathname = usePathname(initialPathname);
  const { sidebarCollapsed, mobileNavOpen, toggleSidebar, setMobileNavOpen } = useShellState();

  // Mirrors the CSS `rail:` triggers so labels hidden by CSS always come back as
  // tooltips — an icon-only rail without them would be unusable.
  const isBelowDesktop = useMediaQuery('(width < 64rem)');
  const isRail = sidebarCollapsed || isBelowDesktop;

  return (
    <TooltipProvider delayDuration={280}>
      <aside
        data-shell-rail
        aria-label="Barra lateral"
        className="sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-background md:flex"
      >
        <SidebarContent pathname={pathname} isCollapsed={isRail} />

        {/* Hidden under `lg`: the rail is forced there, so the toggle would lie. */}
        <div className="hidden border-t border-border p-2 lg:block">
          <Tooltip
            content={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            side="right"
          >
            <button
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
              className={cn(
                'flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-[13px] text-muted',
                'transition-colors duration-150 hover:bg-surface-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                'rail:justify-center rail:px-0',
              )}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-[18px] shrink-0" aria-hidden />
              ) : (
                <PanelLeftClose className="size-[18px] shrink-0" aria-hidden />
              )}
              <span className="truncate rail:hidden">Contraer</span>
            </button>
          </Tooltip>
        </div>
      </aside>

      <Drawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        side="left"
        title="Navegación principal"
        description="Accede a todos los módulos del panel"
        hideHeader
        width="w-[min(17rem,84vw)]"
        className="md:hidden"
      >
        <div className="flex h-full flex-col">
          <SidebarContent
            pathname={pathname}
            isCollapsed={false}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </div>
      </Drawer>
    </TooltipProvider>
  );
}
