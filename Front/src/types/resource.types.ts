import type { IdType } from './common.types';

export type ResourceKindType = 'document' | 'faq' | 'link' | 'dataset' | 'snippet';

export type ResourceIndexStateType = 'indexed' | 'processing' | 'failed' | 'queued';

export interface IResource {
  id: IdType;
  title: string;
  kind: ResourceKindType;
  description: string;
  /** Size in bytes; `0` for links. */
  size: number;
  chunks: number;
  indexState: ResourceIndexStateType;
  updatedAt: string;
  owner: string;
  tags: string[];
}

export interface IResourceFilters {
  search: string;
  kind: ResourceKindType | 'all';
}
