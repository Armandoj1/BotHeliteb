import { useCallback } from 'react';

import { useToast } from '@/hooks/useToast';
import { useListModule, type IListModule } from '@/hooks/useListModule';
import { fetchProducts, toggleProductAi } from '@/services/catalog.service';
import type { ICatalogFilters, IProduct } from '@/types';
import { matchesQuery } from '@/utils/collection';

const INITIAL_FILTERS: ICatalogFilters = { search: '', category: 'all', status: 'all' };

function matchesFilters(item: IProduct, filters: ICatalogFilters): boolean {
  if (filters.status !== 'all' && item.status !== filters.status) return false;
  if (filters.category !== 'all' && item.category !== filters.category) return false;

  return matchesQuery(item, filters.search, ['name', 'sku', 'description', 'category']);
}

export interface ICatalogState extends IListModule<IProduct, ICatalogFilters> {
  setAiEnabled: (product: IProduct, enabled: boolean) => Promise<void>;
}

export function useCatalog(): ICatalogState {
  const list = useListModule({
    loader: fetchProducts,
    initialFilters: INITIAL_FILTERS,
    predicate: matchesFilters,
  });

  const toast = useToast();
  const { resource } = list;

  const setAiEnabled = useCallback(
    async (product: IProduct, enabled: boolean) => {
      // Optimistic: the switch reacts instantly and rolls back only on failure.
      resource.setData((current) =>
        current.map((item) => (item.id === product.id ? { ...item, aiEnabled: enabled } : item)),
      );

      const result = await toggleProductAi(product.id, enabled);

      if (!result.ok) {
        resource.setData((current) =>
          current.map((item) =>
            item.id === product.id ? { ...item, aiEnabled: !enabled } : item,
          ),
        );
        toast.error({ title: 'No se pudo actualizar el producto', description: result.error });
        return;
      }

      toast.success({
        title: enabled ? 'Producto habilitado para IA' : 'Producto excluido de la IA',
        description: product.name,
      });
    },
    [resource, toast],
  );

  return { ...list, setAiEnabled };
}
