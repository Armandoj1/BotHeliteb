import { useEffect } from 'react';

import { useUiStore } from '@/store/ui.store';

export interface IShellState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

/**
 * Bridges the pre-paint DOM state into React exactly once per island, so every
 * shell island (sidebar, header) agrees on the same collapsed/theme values.
 */
export function useShellState(): IShellState {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const hydrateFromDocument = useUiStore((state) => state.hydrateFromDocument);

  useEffect(() => {
    hydrateFromDocument();
  }, [hydrateFromDocument]);

  return { sidebarCollapsed, mobileNavOpen, toggleSidebar, setMobileNavOpen };
}
