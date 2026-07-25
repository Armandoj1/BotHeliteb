import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { renderBotText } from '../lib/renderBotText';
import { buildModelMap, findProductRefs } from '../lib/productRefs';
import { selectProduct } from '../stores/selectedProduct';
import type { Producto } from '../lib/types';

interface ChatMessage {
  role: string;
  content: string;
  created_at: string;
}

const SUGERENCIAS = [
  '¿Qué cámaras domo IP tienen stock?',
  'Compara el DS-2CD1023G0E-I con el DS-2CD1043G0-I',
  '¿En qué bodega hay stock del DS-7204HGHI-M1/T?',
  'Arma un sistema completo de 4 cámaras',
];

function getSessionId(): string {
  const KEY = 'heliteb_panel_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `panel_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export default function ChatPanel() {
  // sessionId arranca vacio: localStorage no existe durante el render en servidor
  // (esta isla se renderiza una vez en SSR antes de hidratar) - se resuelve en un
  // useEffect, que solo corre en el navegador.
  const [sessionId, setSessionId] = useState('');
  const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
    apiGet<Producto[]>('products').then(setProductos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    // El historial guarda tambien mensajes role="tool" (resultados crudos de las
    // funciones que llamo el agente) - no son parte de la conversacion visible.
    apiGet<ChatMessage[]>(`chat/history?sessionId=${sessionId}`)
      .then((msgs) => setMensajes(msgs.filter((m) => m.role === 'user' || m.role === 'assistant')))
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const modelMap = useMemo(() => buildModelMap(productos), [productos]);

  async function send(mensaje: string) {
    if (!mensaje.trim() || isSending) return;
    setIsSending(true);
    setMensajes((m) => [...m, { role: 'user', content: mensaje, created_at: new Date().toISOString() }]);
    setInputText('');
    try {
      const { respuesta } = await apiPost<{ respuesta: string }>('chat', { session_id: sessionId, mensaje });
      setMensajes((m) => [...m, { role: 'assistant', content: respuesta, created_at: new Date().toISOString() }]);
    } catch (e) {
      setMensajes((m) => [
        ...m,
        { role: 'assistant', content: `No pude conectarme con el agente.\n${e instanceof Error ? e.message : ''}`, created_at: new Date().toISOString() },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(inputText);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Chat (prueba del agente)</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mensajes.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Prueba el agente comercial de HELITEB:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420, margin: '0 auto' }}>
              {SUGERENCIAS.map((s) => (
                <button key={s} className="outline-btn" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => {
          const isUser = m.role === 'user';
          const refs = !isUser ? findProductRefs(m.content, modelMap) : [];
          return (
            <div key={i} className={`msg-row ${isUser ? 'user' : 'bot'}`}>
              <div className="msg-bubble-wrap">
                <div
                  className={`msg-bubble ${isUser ? 'user' : 'bot'} ${isUser ? '' : 'msg-content'}`}
                  dangerouslySetInnerHTML={isUser ? undefined : { __html: renderBotText(m.content) }}
                >
                  {isUser ? m.content : undefined}
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
        {isSending && (
          <div className="msg-row bot">
            <div className="msg-bubble-wrap">
              <div className="msg-bubble bot">
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10 }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para salto de línea)"
          rows={1}
          style={{ flex: 1, resize: 'none', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit' }}
        />
        <button className="primary-btn small" onClick={() => send(inputText)} disabled={isSending || !inputText.trim()}>
          {isSending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
