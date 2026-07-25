import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader } from 'lucide-react';
import { apiGet } from '../lib/api';
import { renderBotText } from '../lib/renderBotText';
import { buildModelMap, findProductRefs } from '../lib/productRefs';
import { selectProduct } from '../stores/selectedProduct';
import type { ConversationMessage, PagedResult, Producto } from '../lib/types';

const PAGE_SIZE = 50;

interface Props {
  telefono: string;
}

export default function ConversacionDetalle({ telefono }: Props) {
  const [mensajes, setMensajes] = useState<ConversationMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    apiGet<Producto[]>('products').then(setProductos).catch(() => {});
  }, []);

  useEffect(() => {
    apiGet<PagedResult<ConversationMessage>>(`conversaciones/${telefono}/mensajes?page=1&pageSize=${PAGE_SIZE}`)
      .then((r) => {
        setMensajes(r.items);
        setTotal(r.total);
        setPage(1);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [telefono]);

  useEffect(() => {
    if (!loading && !didInitialScroll.current && mensajes.length > 0) {
      didInitialScroll.current = true;
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    }
  }, [loading, mensajes.length]);

  async function loadOlder() {
    setLoadingOlder(true);
    const el = threadRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const next = page + 1;
      const r = await apiGet<PagedResult<ConversationMessage>>(
        `conversaciones/${telefono}/mensajes?page=${next}&pageSize=${PAGE_SIZE}`,
      );
      setMensajes((prev) => [...r.items, ...prev]);
      setPage(next);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  }

  const modelMap = useMemo(() => buildModelMap(productos), [productos]);

  // El historial guarda tambien mensajes role="tool" (resultados crudos de las
  // funciones que llamo el agente, ej. busqueda de productos) - no son parte de
  // la conversacion real con el cliente, se ocultan del hilo.
  const visibleMensajes = useMemo(
    () => mensajes.filter((m) => m.role === 'user' || m.role === 'assistant'),
    [mensajes],
  );

  if (notFound) {
    return (
      <div className="panel">
        <div className="panel-header">
          <a href="/conversaciones" className="conv-back"><ArrowLeft size={16} /></a>
          <span className="panel-title">Conversación no encontrada</span>
        </div>
        <div className="preview-empty">
          <p>No hay mensajes registrados para +{telefono}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header conv-detalle-header">
        <a href="/conversaciones" className="conv-back"><ArrowLeft size={16} /></a>
        <div>
          <div className="conv-detalle-title">+{telefono}</div>
          {total > 0 && <div className="conv-detalle-sub">{total} mensajes</div>}
        </div>
      </div>

      {loading ? (
        <div className="preview-empty">
          <Loader size={32} color="#4f6ef7" />
          <p>Cargando historial…</p>
        </div>
      ) : (
        <div className="conv-thread" ref={threadRef}>
          {mensajes.length < total && (
            <div className="conv-load-more">
              <button className="outline-btn" onClick={loadOlder} disabled={loadingOlder}>
                {loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores'}
              </button>
            </div>
          )}

          {visibleMensajes.map((m) => {
            const isUser = m.role === 'user';
            const refs = !isUser ? findProductRefs(m.content, modelMap) : [];
            return (
              <div key={m.id} className={`msg-row ${isUser ? 'user' : 'bot'}`}>
                <div className="msg-bubble-wrap">
                  <div
                    className={`msg-bubble ${isUser ? 'user' : 'bot'} ${isUser ? '' : 'msg-content'}`}
                    dangerouslySetInnerHTML={isUser ? undefined : { __html: renderBotText(m.content) }}
                  >
                    {isUser ? m.content : undefined}
                  </div>
                  <div className="conv-msg-time" style={{ textAlign: isUser ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {refs.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {refs.map((r) => {
                        const p = productos.find((x) => x.codigo_sap === r.sap);
                        return (
                          <button
                            key={r.sap}
                            onClick={() => p && selectProduct(p)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', background: 'var(--surface)', cursor: 'pointer' }}
                          >
                            <img src={r.imagen_url} alt={r.modelo} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{r.modelo}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
