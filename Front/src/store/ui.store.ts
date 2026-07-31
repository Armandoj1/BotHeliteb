import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/app';
import { storage } from '@/utils/storage';

export type ThemeType = 'light' | 'dark';

interface IUiStore {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: ThemeType;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  /** Re-reads what the pre-paint inline script already applied to `<html>`. */
  hydrateFromDocument: () => void;
}

/**
 * Shell state shared by independent Astro islands. The DOM is the rendering
 * authority (attributes on `<html>` drive the CSS), the store only mirrors it
 * so React can expose correct ARIA and tooltips.
 */
export const useUiStore = create<IUiStore>((set, get) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  theme: 'light',

  toggleSidebar: () => get().setSidebarCollapsed(!get().sidebarCollapsed),

  setSidebarCollapsed: (collapsed) => {
    applySidebarAttribute(collapsed);
    storage.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
    set({ sidebarCollapsed: collapsed });
  },

  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  setTheme: (theme) => {
    applyThemeClass(theme);
    storage.set(STORAGE_KEYS.THEME, theme);
    set({ theme });
  },

  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

  hydrateFromDocument: () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    set({
      sidebarCollapsed: root.dataset.sidebar === 'collapsed',
      theme: root.classList.contains('dark') ? 'dark' : 'light',
    });
  },
}));

function applySidebarAttribute(collapsed: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
}

function applyThemeClass(theme: ThemeType): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
