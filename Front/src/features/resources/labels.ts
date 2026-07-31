import { Database, FileText, HelpCircle, Link2, Type, type LucideIcon } from 'lucide-react';

import type {
  ISelectOption,
  ResourceIndexStateType,
  ResourceKindType,
  ToneType,
} from '@/types';

export const RESOURCE_KIND_LABELS: Record<ResourceKindType, string> = {
  document: 'Documento',
  faq: 'Preguntas frecuentes',
  link: 'Enlace',
  dataset: 'Conjunto de datos',
  snippet: 'Fragmento',
};

export const RESOURCE_KIND_ICONS: Record<ResourceKindType, LucideIcon> = {
  document: FileText,
  faq: HelpCircle,
  link: Link2,
  dataset: Database,
  snippet: Type,
};

export const RESOURCE_INDEX_LABELS: Record<ResourceIndexStateType, string> = {
  indexed: 'Indexado',
  processing: 'Procesando',
  failed: 'Falló',
  queued: 'En cola',
};

export const RESOURCE_INDEX_TONES: Record<ResourceIndexStateType, ToneType> = {
  indexed: 'success',
  processing: 'primary',
  failed: 'danger',
  queued: 'neutral',
};

export const RESOURCE_KIND_OPTIONS: ISelectOption<ResourceKindType | 'all'>[] = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'document', label: RESOURCE_KIND_LABELS.document },
  { value: 'faq', label: RESOURCE_KIND_LABELS.faq },
  { value: 'dataset', label: RESOURCE_KIND_LABELS.dataset },
  { value: 'link', label: RESOURCE_KIND_LABELS.link },
  { value: 'snippet', label: RESOURCE_KIND_LABELS.snippet },
];
