/** Product-level constants. Kept free of UI imports so anything may consume them. */

export const APP_NAME = 'HelitebAI';
export const APP_TAGLINE = 'Consola de operaciones';

/** Mirrored by the pre-paint inline script in `BaseLayout.astro`. */
export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'heliteb:sidebar-collapsed',
  THEME: 'heliteb:theme',
  SESSION: 'heliteb:session',
  AI_CONNECTIONS: 'heliteb:ai-connections',
  AI_AUTOSAVE: 'heliteb:ai-autosave',
} as const;

export const DEFAULT_PAGE_SIZE = 8;
export const PAGE_SIZE_OPTIONS = [8, 16, 32] as const;

/** Debounce used by search inputs and real-time validation. */
export const SEARCH_DEBOUNCE_MS = 220;
export const AUTOSAVE_DEBOUNCE_MS = 1200;
export const TOAST_DURATION_MS = 4200;
