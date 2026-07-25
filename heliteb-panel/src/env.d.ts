/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly API_URL: string;
  readonly JWT_SIGNING_KEY: string;
  readonly N8N_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    asesor: {
      id: string;
      nombre: string;
      telefono: string;
    };
  }
}
