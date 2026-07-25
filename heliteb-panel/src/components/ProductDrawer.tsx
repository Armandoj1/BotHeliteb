import { useStore } from '@nanostores/react';
import { selectedProduct, clearSelectedProduct } from '../stores/selectedProduct';

const IMG_FALLBACK =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iI2YwZjJmNyIvPjxwYXRoIGQ9Ik0yMCAyNGg0bDMtNGg2bDMgNGg0YTIgMiAwIDAxMiAydjE0YTIgMiAwIDAxLTIgMkgyMGEyIDIgMCAwMS0yLTJWMjZhMiAyIDAgMDEyLTJ6IiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMyIgcj0iNSIgc3Ryb2tlPSIjZDFkNWRiIiBzdHJva2Utd2lkdGg9IjEuNSIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==';

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
}

export default function ProductDrawer() {
  const p = useStore(selectedProduct);
  if (!p) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={clearSelectedProduct} />
      <aside className="drawer">
        <div className="drawer-header">
          <span className="drawer-header-title">Detalle del producto</span>
          <button className="drawer-close" onClick={clearSelectedProduct}>✕</button>
        </div>

        <div className="drawer-body">
          <div className="drawer-img">
            <img
              src={p.imagen_url}
              alt={p.modelo}
              onError={(e) => {
                (e.target as HTMLImageElement).src = IMG_FALLBACK;
              }}
            />
          </div>

          <div className="drawer-meta-row">
            <span className={`product-brand ${p.marca === 'EZVIZ' ? 'ezviz' : ''}`}>{p.marca}</span>
            <span className="drawer-sap">SAP {p.codigo_sap}</span>
          </div>

          <h2 className="drawer-title">{p.modelo}</h2>

          {p.precio_msrp_cop != null && (
            <div className="drawer-price-box">
              <span className="drawer-price-label">MSRP</span>
              <span className="drawer-price">${formatCOP(p.precio_msrp_cop)} COP</span>
            </div>
          )}

          {(p.categoria || p.linea || p.serie || p.sub_serie || p.modelo_etiqueta) && (
            <>
              <div className="drawer-section-title">Clasificación</div>
              <div className="spec-grid">
                {p.categoria && (
                  <div className="spec-chip"><span className="chip-label">Categoría</span><span className="chip-val">{p.categoria}</span></div>
                )}
                {p.linea && (
                  <div className="spec-chip"><span className="chip-label">Línea</span><span className="chip-val">{p.linea}</span></div>
                )}
                {p.serie && (
                  <div className="spec-chip"><span className="chip-label">Serie</span><span className="chip-val">{p.serie}</span></div>
                )}
                {p.sub_serie && (
                  <div className="spec-chip"><span className="chip-label">Sub-serie</span><span className="chip-val">{p.sub_serie}</span></div>
                )}
                {p.modelo_etiqueta && (
                  <div className="spec-chip"><span className="chip-label">Etiqueta</span><span className="chip-val">{p.modelo_etiqueta}</span></div>
                )}
              </div>
            </>
          )}

          {(p.parametro1 || p.parametro2 || p.parametro3) && (
            <>
              <div className="drawer-section-title">Especificaciones</div>
              <ul className="desc-bullets spec-bullets">
                {p.parametro1 && <li>{p.parametro1}</li>}
                {p.parametro2 && <li>{p.parametro2}</li>}
                {p.parametro3 && <li>{p.parametro3}</li>}
              </ul>
            </>
          )}

          <div className="drawer-section-title">
            Disponibilidad{' '}
            <span className={`stock-total-badge ${p.stock_total === 0 ? 'out' : ''}`}>
              {p.stock_total === 0 ? 'Sin stock' : `${p.stock_total} uds en total`}
            </span>
          </div>
          {p.stock_bodegas && p.stock_bodegas.length > 0 ? (
            <ul className="stock-list">
              {p.stock_bodegas.map((b) => (
                <li key={b.codigo_bodega}>
                  <span className="stock-bodega">{b.nombre_sucursal}{b.ciudad ? ` (${b.ciudad})` : ''}</span>
                  <span className="stock-qty">{b.cantidad_disponible} uds</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="stock-empty">No hay unidades disponibles en ninguna bodega.</p>
          )}

          {p.descripcion && (
            <>
              <div className="drawer-section-title">Descripción</div>
              <ul className="desc-bullets">
                {p.descripcion.split(',').map((item, i) => {
                  const trimmed = item.trim();
                  return trimmed ? <li key={i}>{trimmed}</li> : null;
                })}
              </ul>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
