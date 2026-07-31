import type { IdType } from './common.types';

export type ProductStatusType = 'active' | 'draft' | 'archived' | 'out-of-stock';

export interface IProduct {
  id: IdType;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  status: ProductStatusType;
  updatedAt: string;
  /** Whether the assistant may quote this item automatically. */
  aiEnabled: boolean;
}

export interface ICatalogFilters {
  search: string;
  category: string | 'all';
  status: ProductStatusType | 'all';
}
