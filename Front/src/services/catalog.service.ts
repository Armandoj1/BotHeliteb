import type { IApiProducto } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { toProduct } from '@/api/mappers/catalog.mapper';
import type { IProduct, ResultType } from '@/types';
import { readCollection } from './transport';

export function fetchProducts(): Promise<ResultType<IProduct[]>> {
  // No API configured means no catalogue: the ERP sync is the only source.
  return readCollection<IApiProducto, IProduct>(
    ENDPOINTS.catalog.products,
    toProduct,
    async () => [],
  );
}

/**
 * The backend has no per-product AI flag yet, so this only reflects intent in
 * the UI. Wire it to a real endpoint when `productos` gains the column.
 */
export async function toggleProductAi(
  productId: string,
  enabled: boolean,
): Promise<ResultType<{ productId: string; aiEnabled: boolean }>> {
  return { ok: true, value: { productId, aiEnabled: enabled } };
}
