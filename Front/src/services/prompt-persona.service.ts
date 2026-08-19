import type { IApiPromptPersona } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import type { ResultType } from '@/types';
import { readResource, writeResource } from './transport';

// Solo "whatsapp" tiene persona de venta hoy (ver SystemPrompt.BuildVendedorSection);
// "escritorio" es el asistente interno del asesor, sin persona editable.
const CANAL = 'whatsapp';

export function fetchPromptPersona(): Promise<ResultType<IApiPromptPersona>> {
  return readResource<IApiPromptPersona>(ENDPOINTS.promptPersona.get(CANAL), async () => ({
    canal: CANAL,
    contenido: '',
    personalizado: false,
    contenido_por_defecto: '',
  }));
}

export function savePromptPersona(contenido: string): Promise<ResultType<{ ok: boolean }>> {
  return writeResource(
    ENDPOINTS.promptPersona.save,
    'put',
    { canal: CANAL, contenido },
    async () => ({ ok: true }),
  );
}

export function restorePromptPersona(): Promise<ResultType<{ ok: boolean; contenido: string }>> {
  return writeResource(
    ENDPOINTS.promptPersona.restore(CANAL),
    'delete',
    undefined,
    async () => ({ ok: true, contenido: '' }),
  );
}
