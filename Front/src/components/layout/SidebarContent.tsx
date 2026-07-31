import { SidebarBrand } from './SidebarBrand';
import { SidebarNav } from './SidebarNav';

export interface ISidebarContentProps {
  pathname: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

/** Shared body of the desktop rail and the mobile drawer — one nav, two shells. */
export function SidebarContent({ pathname, isCollapsed, onNavigate }: ISidebarContentProps) {
  return (
    <>
      <SidebarBrand />

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
        <SidebarNav pathname={pathname} isCollapsed={isCollapsed} onNavigate={onNavigate} />
      </div>
    </>
  );
}
