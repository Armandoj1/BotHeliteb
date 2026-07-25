import { useEffect, useState } from 'react';
import { Loader, MessageSquare } from 'lucide-react';
import { apiGet } from '../lib/api';
import type { ConversationSummary, PagedResult } from '../lib/types';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
}

function displayName(c: ConversationSummary) {
  return c.nombre_contacto?.trim() || `+${c.telefono}`;
}

const PAGE_SIZE = 30;

export default function ConversacionesList() {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const t = setTimeout(() => {
      apiGet<PagedResult<ConversationSummary>>(`conversaciones?search=${encodeURIComponent(search)}&page=1&pageSize=${PAGE_SIZE}`)
        .then((r) => {
          setItems(r.items);
          setTotal(r.total);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const r = await apiGet<PagedResult<ConversationSummary>>(
        `conversaciones?search=${encodeURIComponent(search)}&page=${next}&pageSize=${PAGE_SIZE}`,
      );
      setItems((prev) => [...prev, ...r.items]);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Conversaciones de WhatsApp</span>
        {total > 0 && <div className="preview-stats"><span>{total} conversaciones</span></div>}
      </div>

      <div className="conv-search-bar">
        <input
          type="text"
          placeholder="Buscar por teléfono o nombre de contacto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="preview-empty">
          <Loader size={32} color="#4f6ef7" />
          <p>Cargando conversaciones…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="preview-empty">
          <MessageSquare size={36} color="#434f66" />
          <p>{search ? 'Sin resultados para esa búsqueda.' : 'Aún no hay conversaciones registradas.'}</p>
        </div>
      ) : (
        <div className="conv-list">
          {items.map((c) => (
            <a className="conv-row" href={`/conversaciones/${c.telefono}`} key={c.telefono}>
              <div className="conv-avatar">{displayName(c).replace('+', '').charAt(0)}</div>
              <div className="conv-main">
                <div className="conv-title-row">
                  <span className="conv-title">{displayName(c)}</span>
                  <span className="conv-time">{formatTime(c.ultimo_mensaje_en)}</span>
                </div>
                <div className="conv-preview">
                  {c.ultimo_mensaje_role === 'user' ? '' : 'Bot: '}
                  {c.ultimo_mensaje_preview ?? '(sin mensajes)'}
                </div>
              </div>
              <span className="conv-badge">{c.total_mensajes}</span>
            </a>
          ))}
          {items.length < total && (
            <div className="conv-load-more">
              <button className="outline-btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
