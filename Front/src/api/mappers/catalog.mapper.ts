import type { IApiProducto } from '@/api/contracts';
import type { IProduct, ProductStatusType } from '@/types';

/**
 * The catalogue has no explicit status column: a product is active if it came
 * back from `/api/products` (the query already filters `activo = TRUE`), so the
 * only distinction the data supports is whether there is stock.
 */
function resolveStatus(producto: IApiProducto): ProductStatusType {
  return producto.stock_total > 0 ? 'active' : 'out-of-stock';
}

/** Prefers the human label; falls back to brand + model when it is missing. */
function resolveName(producto: IApiProducto): string {
  return producto.modelo_etiqueta?.trim() || `${producto.marca} ${producto.modelo}`.trim();
}

export function toProduct(producto: IApiProducto): IProduct {
  return {
    id: producto.codigo_sap,
    sku: producto.codigo_sap,
    name: resolveName(producto),
    category: producto.categoria,
    description: producto.descripcion?.trim() || `${producto.marca} · ${producto.modelo}`,
    price: producto.precio_msrp_cop ?? 0,
    currency: 'COP',
    stock: producto.stock_total,
    status: resolveStatus(producto),
    // The API does not track a per-product timestamp; the catalogue is replaced
    // wholesale by the ERP sync, so "now" is the honest answer for freshness.
    updatedAt: new Date().toISOString(),
    // Everything returned by the catalogue is quotable by the agent — there is
    // no per-product opt-out in the backend yet.
    aiEnabled: true,
  };
}
