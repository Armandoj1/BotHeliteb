import { Menu } from 'lucide-react';

import { Breadcrumb, Separator, TooltipProvider } from '@/components/ui';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { usePathname } from '@/hooks/usePathname';
import { useSessionUser } from '@/hooks/useSessionUser';
import { useUiStore } from '@/store/ui.store';
import { buildBreadcrumbs, findActiveNavItem } from '@/utils/route';
import { CommandPalette } from './CommandPalette';
import { HeaderSearchTrigger } from './HeaderSearchTrigger';
import { NotificationsMenu } from './NotificationsMenu';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export interface IAppHeaderProps {
  /** Route at first render; kept current by `usePathname` afterwards. */
  pathname: string;
}

export function AppHeader({ pathname: initialPathname }: IAppHeaderProps) {
  const pathname = usePathname(initialPathname);
  const user = useSessionUser();
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const palette = useCommandPalette();

  const moduleTitle = findActiveNavItem(pathname)?.label ?? 'Panel';
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <TooltipProvider delayDuration={280}>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-[var(--header-height)] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir navegación"
            className="-ml-1 grid size-9 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:hidden"
          >
            <Menu className="size-[18px]" aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              {moduleTitle}
            </h1>
            {breadcrumbs.length > 1 ? (
              <Breadcrumb items={breadcrumbs} className="hidden sm:block" />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <HeaderSearchTrigger onOpen={() => palette.setOpen(true)} />
            <ThemeToggle />
            <NotificationsMenu notifications={[]} />
            <Separator orientation="vertical" className="mx-1 h-6" />
            {user ? <UserMenu user={user} /> : null}
          </div>
        </div>
      </header>

      <CommandPalette state={palette} />
    </TooltipProvider>
  );
}
