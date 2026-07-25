import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGet } from '../lib/api';
import { selectProduct } from '../stores/selectedProduct';
import type { Producto } from '../lib/types';

const IMG_FALLBACK =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iI2YwZjJmNyIvPjxwYXRoIGQ9Ik0yMCAyNGg0bDMtNGg2bDMgNGg0YTIgMiAwIDAxMiAydjE0YTIgMiAwIDAxLTIgMkgyMGEyIDIgMCAwMS0yLTJWMjZhMiAyIDAgMDEyLTJ6IiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMyIgcj0iNSIgc3Ryb2tlPSIjZDFkNWRiIiBzdHJva2Utd2lkdGg9IjEuNSIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==';

// Renderizado incremental: nunca se crean miles de tarjetas de golpe (congela el hilo).
const PAGE = 60;

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
}

export default function CatalogGrid() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [renderLimit, setRenderLimit] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiGet<Producto[]>('products')
      .then(setProductos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const marcas = useMemo(() => [...new Set(productos.map((p) => p.marca))].sort(), [productos]);
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    // Con busqueda de texto activa, se ignora el filtro de categoria (el texto ya es especifico).
    const cat = q ? '' : categoria;
    return productos.filter((p) => {
      if (marca && p.marca !== marca) return false;
      if (cat && p.categoria !== cat) return false;
      if (!q) return true;
      return (
        p.modelo.toLowerCase().includes(q) ||
        p.codigo_sap.includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        (p.modelo_etiqueta ?? '').toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q)
      );
    });
  }, [productos, search, marca, categoria]);

  const displayed = filtered.slice(0, renderLimit);

  // Cualquier cambio de filtro reinicia la ventana de render.
  useEffect(() => setRenderLimit(PAGE), [search, marca, categoria]);

  // IntersectionObserver en vez de onScroll manual: mas preciso, no recalcula en cada evento.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderLimit((n) => (n < filtered.length ? n + PAGE : n));
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Catálogo</span>
        <div className="preview-stats">
          <span>{marcas.join(' + ')}</span>
          <span>{categorias.length} categorías</span>
          <span>{productos.length} productos</span>
        </div>
      </div>

      <div style={{ padding: '14px 22px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <input
          type="text"
          placeholder="Buscar por modelo, SAP, categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {marcas.map((m) => (
            <button
              key={m}
              className={`outline-btn small ${marca === m ? 'active' : ''}`}
              onClick={() => setMarca(marca === m ? '' : m)}
              style={marca === m ? { background: 'var(--accent-l)', color: 'var(--accent)', borderColor: 'rgba(79,110,247,.3)' } : undefined}
            >
              {m}
            </button>
          ))}
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          disabled={!!search.trim()}
          style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading && <p style={{ color: 'var(--text2)' }}>Cargando catálogo…</p>}
        {error && <p className="field-error">{error}</p>}
        {!loading && !error && (
          <>
            <div className="catalog-grid">
              {displayed.map((p) => (
                <button key={p.codigo_sap} className="catalog-card" onClick={() => selectProduct(p)}>
                  <div className="catalog-card-img">
                    <img
                      src={p.imagen_url}
                      alt={p.modelo}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = IMG_FALLBACK;
                      }}
                    />
                  </div>
                  <span className="catalog-card-brand">{p.marca}</span>
                  <span className="catalog-card-modelo">{p.modelo}</span>
                  <span className="catalog-card-categoria">{p.categoria}</span>
                  {p.precio_msrp_cop != null && (
                    <span className="catalog-card-precio">${formatCOP(p.precio_msrp_cop)}</span>
                  )}
                </button>
              ))}
            </div>
            {displayed.length < filtered.length && <div ref={sentinelRef} style={{ height: 1 }} />}
            {filtered.length === 0 && <p style={{ color: 'var(--text2)', marginTop: 20 }}>No hay productos que coincidan con la búsqueda.</p>}
          </>
        )}
      </div>
    </div>
  );
}
