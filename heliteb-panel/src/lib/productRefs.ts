import type { Producto } from './types';

const CLOUD_THUMB = 'https://res.cloudinary.com/dejnhu8vx/image/upload/w_200,h_200,c_fit,q_auto:best,f_auto/heliteb/';

export interface ProductRef {
  sap: string;
  modelo: string;
  imagen_url: string;
}

/** modelo (y su variante "base", sin el sufijo entre parentesis) -> producto, todo en minusculas. */
export function buildModelMap(productos: Producto[]): Map<string, Producto> {
  const map = new Map<string, Producto>();
  for (const p of productos) {
    if (!p.modelo) continue;
    const full = p.modelo.toLowerCase();
    map.set(full, p);
    const base = full.split('(')[0].trimEnd().replace(/-+$/, '');
    if (base && base !== full && !map.has(base)) map.set(base, p);
  }
  return map;
}

/**
 * Detecta que modelos/codigos de producto se mencionan literalmente en un texto (una
 * respuesta del bot) para poder mostrar una tarjeta clickeable que abra el Product
 * Drawer - mismo patron que ya usaba el panel Angular en el Chat.
 */
export function findProductRefs(text: string, modelMap: Map<string, Producto>): ProductRef[] {
  if (modelMap.size === 0) return [];
  const seen = new Set<string>();
  const refs: ProductRef[] = [];
  // Los modelos mas largos van primero para que un match no se quede corto en un
  // prefijo compartido de un modelo mas especifico (ej. "DS-2CD1043G0-I" vs
  // "DS-2CD1043G0-I(C)").
  const models = [...modelMap.keys()].sort((a, b) => b.length - a.length);

  for (const model of models) {
    const esc = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\w(-])(${esc})(?![\\w(-])`, 'gi');
    if (!re.test(text)) continue;
    const p = modelMap.get(model)!;
    if (!seen.has(p.codigo_sap)) {
      seen.add(p.codigo_sap);
      refs.push({ sap: p.codigo_sap, modelo: p.modelo, imagen_url: CLOUD_THUMB + p.codigo_sap });
    }
  }
  return refs;
}
