import type {
  ComparisonCategoryType,
  IProviderCapabilities,
  IProviderDefinition,
  ProviderCategoryType,
  ProviderIdType,
} from '@/types';
import { HOSTED_PROVIDERS } from './hosted-providers';
import { INFRASTRUCTURE_PROVIDERS } from './infrastructure-providers';

/**
 * The provider registry. Everything downstream — forms, validation schemas,
 * status badges, usage tables — is generated from these definitions, so adding
 * a provider is a data change rather than a code change (open/closed).
 */
export const PROVIDER_DEFINITIONS: readonly IProviderDefinition[] = [
  ...HOSTED_PROVIDERS,
  ...INFRASTRUCTURE_PROVIDERS,
];

const DEFINITIONS_BY_ID = new Map<ProviderIdType, IProviderDefinition>(
  PROVIDER_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getProviderDefinition(id: ProviderIdType): IProviderDefinition {
  const definition = DEFINITIONS_BY_ID.get(id);
  if (!definition) throw new Error(`Proveedor desconocido: ${id}`);
  return definition;
}

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategoryType, string> = {
  hosted: 'APIs directas',
  gateway: 'Pasarelas',
  cloud: 'Nubes empresariales',
  local: 'Ejecución local',
};

export const PROVIDER_CATEGORY_ORDER: readonly ProviderCategoryType[] = [
  'hosted',
  'gateway',
  'cloud',
  'local',
];

/**
 * What each provider can actually be asked to do, per the backend that exists
 * today (`ILlmClient` has exactly two implementations — DeepSeek, Groq — and
 * `IEmbeddingClient` has exactly two — Ollama, Gemini). Everything else in the
 * console can be configured, but the engine cannot call it in either role: the
 * panel would be lying if it offered them as comparator options.
 */
const NONE: IProviderCapabilities = { llm: false, embedding: false };

const PROVIDER_CAPABILITIES: Record<ProviderIdType, IProviderCapabilities> = {
  deepseek: { llm: true, embedding: false },
  groq: { llm: true, embedding: false },
  ollama: { llm: false, embedding: true },
  gemini: { llm: false, embedding: true },
  openai: NONE,
  anthropic: NONE,
  grok: NONE,
  mistral: NONE,
  openrouter: NONE,
  huggingface: NONE,
  'azure-openai': NONE,
  'aws-bedrock': NONE,
};

export function getProviderCapabilities(providerId: ProviderIdType): IProviderCapabilities {
  return PROVIDER_CAPABILITIES[providerId];
}

/** Whether a provider can serve the given comparison axis. `full` needs both. */
export function supportsCategory(providerId: ProviderIdType, category: ComparisonCategoryType): boolean {
  const capabilities = PROVIDER_CAPABILITIES[providerId];

  if (category === 'llm') return capabilities.llm;
  if (category === 'embedding') return capabilities.embedding;
  return capabilities.llm || capabilities.embedding;
}

export const LLM_PROVIDER_IDS: readonly ProviderIdType[] = PROVIDER_DEFINITIONS.filter(
  (definition) => PROVIDER_CAPABILITIES[definition.id].llm,
).map((definition) => definition.id);

export const EMBEDDING_PROVIDER_IDS: readonly ProviderIdType[] = PROVIDER_DEFINITIONS.filter(
  (definition) => PROVIDER_CAPABILITIES[definition.id].embedding,
).map((definition) => definition.id);
