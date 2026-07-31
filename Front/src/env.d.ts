/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API. Falls back to `/api` when unset. */
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
