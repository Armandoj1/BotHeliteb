import type { IProviderDefinition } from '@/types';
import {
  AZURE_API_VERSIONS,
  BEDROCK_MODELS,
  BEDROCK_REGIONS,
  OPENROUTER_MODELS,
} from './models';

/** Gateways, cloud deployments and local runtimes — anything that needs more
 *  than a bearer token: endpoints, deployments, regions or a local server. */
export const INFRASTRUCTURE_PROVIDERS: IProviderDefinition[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    vendor: 'OpenRouter, Inc.',
    description: 'Pasarela única hacia decenas de modelos con conmutación automática.',
    category: 'gateway',
    docsUrl: 'https://openrouter.ai/docs',
    accent: '#6467f2',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        kind: 'secret',
        required: true,
        placeholder: 'sk-or-v1-…',
        pattern: {
          source: '^sk-or-v1-[A-Za-z0-9]{32,}$',
          message: 'Debe comenzar con «sk-or-v1-».',
        },
      },
      {
        name: 'model',
        label: 'Modelo por defecto',
        kind: 'select',
        required: true,
        options: OPENROUTER_MODELS,
      },
    ],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    vendor: 'Hugging Face, Inc.',
    description: 'Inference Endpoints y modelos abiertos alojados en el Hub.',
    category: 'gateway',
    docsUrl: 'https://huggingface.co/docs/api-inference',
    accent: '#ff9d00',
    fields: [
      {
        name: 'token',
        label: 'Access Token',
        kind: 'secret',
        required: true,
        placeholder: 'hf_…',
        helpText: 'Requiere permiso de lectura sobre el repositorio del modelo.',
        pattern: {
          source: '^hf_[A-Za-z0-9]{30,}$',
          message: 'Los tokens de Hugging Face comienzan con «hf_».',
        },
      },
      {
        name: 'model',
        label: 'Modelo',
        kind: 'text',
        required: true,
        placeholder: 'meta-llama/Llama-3.3-70B-Instruct',
        helpText: 'Identificador completo del repositorio en el Hub.',
      },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    vendor: 'Ejecución local',
    description: 'Inferencia en tu propia infraestructura, sin salida a internet.',
    category: 'local',
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    accent: '#111113',
    fields: [
      {
        name: 'baseUrl',
        label: 'URL del servidor',
        kind: 'url',
        required: true,
        placeholder: 'http://localhost:11434',
        helpText: 'Debe ser alcanzable desde el backend, no desde el navegador.',
      },
      {
        // Free text on purpose: the installed models depend on what was pulled
        // on that server, so a fixed list would lock out the real one.
        name: 'model',
        label: 'Modelo instalado',
        kind: 'text',
        required: true,
        placeholder: 'nomic-embed-text',
        helpText:
          'El nombre exacto que devuelve `ollama list` en tu servidor, con etiqueta si la usas (por ejemplo llama3.3:70b).',
      },
    ],
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    vendor: 'Microsoft Azure',
    description: 'Modelos OpenAI desplegados bajo tu propio tenant y acuerdos de datos.',
    category: 'cloud',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai',
    accent: '#0078d4',
    fields: [
      {
        name: 'endpoint',
        label: 'Endpoint',
        kind: 'url',
        required: true,
        placeholder: 'https://mi-recurso.openai.azure.com',
        pattern: {
          source: '^https://[a-z0-9-]+\\.openai\\.azure\\.com/?$',
          message: 'Formato esperado: https://<recurso>.openai.azure.com',
        },
      },
      {
        name: 'apiKey',
        label: 'API Key',
        kind: 'secret',
        required: true,
        placeholder: 'Clave 1 o Clave 2 del recurso',
        minLength: 32,
      },
      {
        name: 'deployment',
        label: 'Deployment',
        kind: 'text',
        required: true,
        placeholder: 'gpt-4.1-produccion',
        helpText: 'Nombre del despliegue, no el del modelo base.',
        span: 'half',
      },
      {
        name: 'apiVersion',
        label: 'API Version',
        kind: 'select',
        required: true,
        options: AZURE_API_VERSIONS,
        span: 'half',
      },
    ],
  },
  {
    id: 'aws-bedrock',
    name: 'AWS Bedrock',
    vendor: 'Amazon Web Services',
    description: 'Catálogo multi-vendedor con facturación unificada en tu cuenta de AWS.',
    category: 'cloud',
    docsUrl: 'https://docs.aws.amazon.com/bedrock',
    accent: '#ff9900',
    fields: [
      {
        name: 'accessKeyId',
        label: 'Access Key ID',
        kind: 'text',
        required: true,
        placeholder: 'AKIA…',
        pattern: {
          source: '^(AKIA|ASIA)[A-Z0-9]{16}$',
          message: 'Debe tener 20 caracteres y comenzar con «AKIA» o «ASIA».',
        },
        span: 'half',
      },
      {
        name: 'secretAccessKey',
        label: 'Secret Access Key',
        kind: 'secret',
        required: true,
        placeholder: '40 caracteres',
        minLength: 40,
        span: 'half',
      },
      {
        name: 'region',
        label: 'Región',
        kind: 'select',
        required: true,
        options: BEDROCK_REGIONS,
        span: 'half',
      },
      {
        name: 'model',
        label: 'Modelo por defecto',
        kind: 'select',
        required: true,
        options: BEDROCK_MODELS,
        span: 'half',
      },
    ],
  },
];
