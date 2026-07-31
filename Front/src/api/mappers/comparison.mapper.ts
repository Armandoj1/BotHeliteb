import type { IApiComparacionItem } from '@/api/contracts';
import type { ISemanticMatch } from '@/types';

export function toSemanticMatch(item: IApiComparacionItem): ISemanticMatch {
  return {
    sku: item.codigo_sap,
    brand: item.marca,
    model: item.modelo,
    description: item.descripcion,
    distance: item.distancia,
  };
}
