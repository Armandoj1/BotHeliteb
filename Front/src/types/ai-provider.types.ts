import type { ISelectOption, Nullable } from './common.types';

export type ProviderIdType =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'grok'
  | 'groq'
  | 'deepseek'
  | 'mistral'
  | 'openrouter'
  | 'ollama'
  | 'azure-openai'
  | 'aws-bedrock'
  | 'huggingface';

/** How a provider is reached — drives grouping and the "local runtime" badge. */
export type ProviderCategoryType = 'hosted' | 'gateway' | 'cloud' | 'local';

/** Widget + validation strategy for a single credential input. */
export type CredentialFieldKindType = 'secret' | 'text' | 'url' | 'select';

export interface ICredentialFieldPattern {
  /** Serialised so definitions stay plain data (no RegExp instances). */
  source: string;
  message: string;
}

export interface ICredentialField {
  /** Key inside `IProviderConnection.credentials`. */
  name: string;
  label: string;
  kind: CredentialFieldKindType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  /** Options for `kind: 'select'` — model lists, regions, API versions. */
  options?: ISelectOption[];
  pattern?: ICredentialFieldPattern;
  minLength?: number;
  /** Renders the field at half width on wide viewports. */
  span?: 'full' | 'half';
}

export interface IProviderDefinition {
  id: ProviderIdType;
  name: string;
  vendor: string;
  description: string;
  category: ProviderCategoryType;
  docsUrl: string;
  /** Brand hue used by the logo tile — never applied to app chrome. */
  accent: string;
  fields: ICredentialField[];
}

export type ConnectionStatusType =
  | 'connected'
  | 'invalid'
  | 'incomplete'
  | 'disconnected'
  | 'testing';

export type ProviderCredentialsType = Record<string, string>;

export interface IProviderConnection {
  providerId: ProviderIdType;
  status: ConnectionStatusType;
  credentials: ProviderCredentialsType;
  enabled: boolean;
  lastTestedAt: Nullable<string>;
  latencyMs: Nullable<number>;
  /** Human-readable outcome of the last connection test. */
  message: Nullable<string>;
  updatedAt: Nullable<string>;
}

export interface IConnectionTestResult {
  status: Extract<ConnectionStatusType, 'connected' | 'invalid' | 'incomplete'>;
  latencyMs: number;
  message: string;
  testedAt: string;
}

export interface IProviderUsage {
  providerId: ProviderIdType;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  /** Share of total workspace traffic, 0–1. */
  share: number;
}
