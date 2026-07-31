import type {
  ConnectionStatusType,
  IProviderDefinition,
  ProviderCredentialsType,
  ToneType,
} from '@/types';

export type CompletenessType = 'empty' | 'incomplete' | 'complete';

/** Pure completeness check — no schema, no network, safe to call on every keystroke. */
export function resolveCompleteness(
  definition: IProviderDefinition,
  credentials: ProviderCredentialsType,
): CompletenessType {
  const required = definition.fields.filter((field) => field.required);
  const filled = required.filter((field) => (credentials[field.name] ?? '').trim().length > 0);

  if (filled.length === 0) return 'empty';
  if (filled.length < required.length) return 'incomplete';
  return 'complete';
}

export const STATUS_LABELS: Record<ConnectionStatusType, string> = {
  connected: 'Conectado',
  invalid: 'Credencial inválida',
  incomplete: 'Falta información',
  disconnected: 'Sin configurar',
  testing: 'Probando…',
};

export const STATUS_TONES: Record<ConnectionStatusType, ToneType> = {
  connected: 'success',
  invalid: 'danger',
  incomplete: 'warning',
  disconnected: 'neutral',
  testing: 'primary',
};

