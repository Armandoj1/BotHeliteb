import { atom } from 'nanostores';
import type { Producto } from '../lib/types';

// nanostores (no React Context): cada isla de React es su propia raiz de hidratacion
// separada, asi que Context no cruza entre islas de la misma pagina - nanostores si,
// es justo lo que Astro recomienda para este caso (ej. Catalogo/Chat abren el mismo
// drawer, que vive como una isla aparte en el layout).
export const selectedProduct = atom<Producto | null>(null);

export function selectProduct(p: Producto) {
  selectedProduct.set(p);
}

export function clearSelectedProduct() {
  selectedProduct.set(null);
}
