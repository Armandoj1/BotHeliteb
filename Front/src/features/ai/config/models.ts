import type { ISelectOption } from '@/types';

/**
 * Model catalogues per vendor. Kept apart from the provider definitions so the
 * lists can later be replaced by a `GET /providers/:id/models` call without
 * touching the form layer.
 */

export const OPENAI_MODELS: ISelectOption[] = [
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Equilibrio entre costo y calidad' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini', description: 'Alta velocidad, bajo costo' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Multimodal en tiempo real' },
  { value: 'o3-mini', label: 'o3-mini', description: 'Razonamiento de cadena larga' },
];

export const ANTHROPIC_MODELS: ISelectOption[] = [
  { value: 'claude-opus-5', label: 'Claude Opus 5', description: 'Máxima capacidad de análisis' },
  { value: 'claude-sonnet-5', label: 'Claude Sonnet 5', description: 'Predeterminado recomendado' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Respuestas de baja latencia' },
];

export const GEMINI_MODELS: ISelectOption[] = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Contexto extendido' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Optimizado para volumen' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Generación anterior' },
];

export const GROK_MODELS: ISelectOption[] = [
  { value: 'grok-4', label: 'Grok 4', description: 'Modelo insignia de xAI' },
  { value: 'grok-3', label: 'Grok 3' },
  { value: 'grok-3-mini', label: 'Grok 3 mini', description: 'Económico' },
];

export const GROQ_MODELS: ISelectOption[] = [
  {
    value: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile',
    description: 'Equilibrio entre calidad y velocidad',
  },
  {
    value: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    description: 'Latencia mínima, costo bajo',
  },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B', description: 'Ligero, para clasificación' },
  {
    value: 'deepseek-r1-distill-llama-70b',
    label: 'DeepSeek R1 Distill 70B',
    description: 'Razonamiento explícito',
  },
];

export const DEEPSEEK_MODELS: ISelectOption[] = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', description: 'Conversacional general' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', description: 'Cadena de razonamiento' },
];

export const MISTRAL_MODELS: ISelectOption[] = [
  { value: 'mistral-large-latest', label: 'Mistral Large' },
  { value: 'mistral-small-latest', label: 'Mistral Small', description: 'Costo reducido' },
  { value: 'codestral-latest', label: 'Codestral', description: 'Especializado en código' },
];

export const OPENROUTER_MODELS: ISelectOption[] = [
  { value: 'anthropic/claude-sonnet-5', label: 'anthropic/claude-sonnet-5' },
  { value: 'openai/gpt-4.1', label: 'openai/gpt-4.1' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'meta-llama/llama-3.3-70b-instruct' },
  { value: 'mistralai/mistral-large', label: 'mistralai/mistral-large' },
];

export const AZURE_API_VERSIONS: ISelectOption[] = [
  { value: '2025-04-01-preview', label: '2025-04-01-preview', description: 'Vista previa' },
  { value: '2025-01-01-preview', label: '2025-01-01-preview', description: 'Vista previa' },
  { value: '2024-10-21', label: '2024-10-21', description: 'Estable (GA)' },
];

export const BEDROCK_REGIONS: ISelectOption[] = [
  { value: 'us-east-1', label: 'us-east-1', description: 'Norte de Virginia' },
  { value: 'us-west-2', label: 'us-west-2', description: 'Oregón' },
  { value: 'eu-central-1', label: 'eu-central-1', description: 'Fráncfort' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1', description: 'Tokio' },
];

export const BEDROCK_MODELS: ISelectOption[] = [
  { value: 'us.anthropic.claude-sonnet-5-v1:0', label: 'Claude Sonnet 5' },
  { value: 'us.anthropic.claude-haiku-4-5-v1:0', label: 'Claude Haiku 4.5' },
  { value: 'amazon.nova-pro-v1:0', label: 'Amazon Nova Pro' },
  { value: 'meta.llama3-3-70b-instruct-v1:0', label: 'Llama 3.3 70B Instruct' },
];
