import { Bell, CreditCard, MessageSquare, RefreshCcw, ShieldAlert } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import type { INotification, NotificationKindType } from '@/types';
import { formatRelativeTime } from '@/utils/format-date';

const KIND_ICONS: Record<NotificationKindType, typeof Bell> = {
  system: ShieldAlert,
  conversation: MessageSquare,
  billing: CreditCard,
  sync: RefreshCcw,
};

export interface INotificationsMenuProps {
  notifications: readonly INotification[];
}

export function NotificationsMenu({ notifications }: INotificationsMenuProps) {
  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
          className="relative grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:bg-surface-muted data-[state=open]:text-foreground"
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
              aria-hidden
            />
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[min(21rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-3.5 py-3">
          <p className="text-[13px] font-semibold text-foreground">Notificaciones</p>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-medium text-primary">
              {unreadCount} nuevas
            </span>
          ) : null}
        </div>

        <DropdownMenuSeparator className="mx-0 my-0" />

        <div className="max-h-[19rem] overflow-y-auto p-1">
          {notifications.map((notification) => {
            const Icon = KIND_ICONS[notification.kind];

            return (
              <DropdownMenuItem key={notification.id} asChild>
                <a href={notification.href ?? '#'} className="items-start">
                  <span
                    className={cn(
                      'mt-0.5 grid size-7 shrink-0 place-items-center rounded-md',
                      notification.read ? 'bg-surface-muted' : 'bg-primary-tint',
                    )}
                  >
                    <Icon
                      className={cn('size-3.5', notification.read ? 'text-subtle' : '!text-primary')}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {notification.title}
                      </span>
                      {notification.read ? null : (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted">
                      {notification.description}
                    </span>
                    <span className="mt-1 block text-[11px] text-subtle">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                </a>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="mx-0 my-0" />

        <div className="p-1">
          <DropdownMenuItem className="justify-center text-[12px] font-medium text-primary">
            Marcar todas como leídas
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
