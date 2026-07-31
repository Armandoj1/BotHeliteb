import type { IProduct, ISelectOption, ProductStatusType, ToneType } from '@/types';

export const PRODUCT_STATUS_LABELS: Record<ProductStatusType, string> = {
  active: 'Activo',
  draft: 'Borrador',
  archived: 'Archivado',
  'out-of-stock': 'Sin existencias',
};

export const PRODUCT_STATUS_TONES: Record<ProductStatusType, ToneType> = {
  active: 'success',
  draft: 'warning',
  archived: 'neutral',
  'out-of-stock': 'danger',
};

export const PRODUCT_STATUS_OPTIONS: ISelectOption<ProductStatusType | 'all'>[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: PRODUCT_STATUS_LABELS.active },
  { value: 'out-of-stock', label: PRODUCT_STATUS_LABELS['out-of-stock'] },
  { value: 'draft', label: PRODUCT_STATUS_LABELS.draft },
  { value: 'archived', label: PRODUCT_STATUS_LABELS.archived },
];

/** Categories come from the catalogue actually loaded, never from a fixed list. */
export function buildCategoryOptions(products: readonly IProduct[]): ISelectOption[] {
  const categories = [...new Set(products.map((product) => product.category))].sort();

  return [
    { value: 'all', label: 'Todas las categorías' },
    ...categories.map((category) => ({ value: category, label: category })),
  ];
}

/** Stock thresholds drive the colour of the quantity cell. */
export function describeStock(stock: number): { label: string; tone: ToneType } {
  if (stock === 0) return { label: 'Agotado', tone: 'danger' };
  if (stock < 20) return { label: 'Bajo', tone: 'warning' };
  return { label: 'Disponible', tone: 'success' };
}
