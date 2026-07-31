import { ChevronsUpDown, LifeBuoy, LogOut, Settings2, UserRound } from 'lucide-react';

import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { signOut } from '@/services/auth.service';
import type { IUser, UserRoleType } from '@/types';

const ROLE_LABELS: Record<UserRoleType, string> = {
  admin: 'Administrador',
  asesor: 'Asesor',
};

export interface IUserMenuProps {
  user: IUser;
}

export function UserMenu({ user }: IUserMenuProps) {
  /** Leaving the app crosses a session boundary, so this is a full navigation. */
  function handleSignOut() {
    signOut();
    window.location.assign(ROUTES.LOGIN);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Menú de ${user.name}`}
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:bg-surface-muted"
        >
          <Avatar name={user.name} initials={user.initials} src={user.avatarUrl} />
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-[13px] font-medium leading-tight text-foreground">
              {user.name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-subtle">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
          <ChevronsUpDown className="hidden size-3.5 shrink-0 text-subtle sm:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64">
        <div className="flex items-center gap-2.5 px-2.5 py-2.5">
          <Avatar name={user.name} initials={user.initials} src={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
            <p className="truncate text-[12px] text-muted">{user.email}</p>
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{user.organization}</DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <a href={ROUTES.SETTINGS}>
            <UserRound aria-hidden />
            Perfil y cuenta
            <DropdownMenuShortcut>⇧P</DropdownMenuShortcut>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a href={ROUTES.SETTINGS}>
            <Settings2 aria-hidden />
            Configuración
            <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a href={ROUTES.RESOURCES}>
            <LifeBuoy aria-hidden />
            Centro de ayuda
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onSelect={handleSignOut}>
          <LogOut aria-hidden />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
