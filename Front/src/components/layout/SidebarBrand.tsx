import { BrandMark } from '@/components/common/BrandMark';
import { APP_NAME, APP_TAGLINE } from '@/constants/app';
import { ROUTES } from '@/constants/routes';

export function SidebarBrand() {
  return (
    <a
      href={ROUTES.DASHBOARD}
      className="flex h-[var(--header-height)] items-center gap-2.5 overflow-hidden px-4 rail:justify-center rail:px-0"
      aria-label={`${APP_NAME} — ir al panel general`}
    >
      <BrandMark />
      <span className="min-w-0 rail:hidden">
        <span className="block truncate text-[14px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {APP_NAME}
        </span>
        <span className="block truncate text-[11px] leading-tight text-subtle">{APP_TAGLINE}</span>
      </span>
    </a>
  );
}
