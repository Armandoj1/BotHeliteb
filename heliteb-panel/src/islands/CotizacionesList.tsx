import { useEffect, useState } from 'react';
import { Loader, FileText, Download, Mail, Send } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import type { Cotizacion } from '../lib/types';

const WA_ICON_PATH =
  'M17.47 14.38c-.3-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.91-2.19-.24-.57-.48-.5-.66-.5-.17 0-.37-.02-.56-.02-.2 0-.51.07-.78.37-.27.3-1.02 1-1.02 2.43 0 1.43 1.04 2.82 1.19 3.01.15.2 2.05 3.13 4.97 4.39.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.74-.71 1.98-1.4.24-.69.24-1.28.17-1.4-.07-.12-.27-.2-.56-.34M12.04 21.5h-.01a9.42 9.42 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.41 9.41 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.46-9.43 2.53 0 4.9.99 6.69 2.78a9.38 9.38 0 0 1 2.77 6.66c0 5.2-4.24 9.43-9.45 9.43m8.04-17.47A11.32 11.32 0 0 0 12.04.7C5.79.7.7 5.78.7 12.03c0 1.99.52 3.94 1.51 5.66L.6 23.4l5.85-1.54a11.3 11.3 0 0 0 5.59 1.43h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02';

function WaIcon({ size = 15 }: { size?: number }) {
  return (
    <svg className="wa-ico" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={WA_ICON_PATH} />
    </svg>
  );
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CotizacionesList() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);

  const [waFolio, setWaFolio] = useState<string | null>(null);
  const [waTo, setWaTo] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ folio: string; ok: boolean; msg: string } | null>(null);

  const [emailFolio, setEmailFolio] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ folio: string; ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    apiGet<Cotizacion[]>('cotizaciones').then(setCotizaciones).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function downloadPdf(folio: string) {
    window.open(`/api/backend/cotizacion/${folio}/pdf`, '_blank');
  }

  function openWaForm(folio: string) {
    setWaFolio(waFolio === folio ? null : folio);
    setEmailFolio(null);
    setWaTo('');
    setWaResult(null);
  }

  function openEmailForm(folio: string) {
    setEmailFolio(emailFolio === folio ? null : folio);
    setWaFolio(null);
    setEmailTo('');
    setEmailResult(null);
  }

  async function sendWhatsApp(folio: string) {
    const destino = waTo.trim().replace(/\D/g, '');
    if (!destino) { alert('Ingresa el número de WhatsApp'); return; }
    setWaSending(true);
    setWaResult(null);
    try {
      await apiPost('cotizacion/' + folio + '/whatsapp', { destino });
      setWaResult({ folio, ok: true, msg: `Cotización enviada a ${destino}` });
      setWaTo('');
    } catch (e) {
      setWaResult({ folio, ok: false, msg: e instanceof Error ? e.message : 'Sin conexión al backend' });
    } finally {
      setWaSending(false);
    }
  }

  async function sendEmail(folio: string) {
    const destino = emailTo.trim();
    if (!destino) { alert('Ingresa el correo del destinatario'); return; }
    setEmailSending(true);
    setEmailResult(null);
    try {
      await apiPost('cotizacion/' + folio + '/email', { destino });
      setEmailResult({ folio, ok: true, msg: `Cotización enviada a ${destino}` });
      setEmailTo('');
    } catch (e) {
      setEmailResult({ folio, ok: false, msg: e instanceof Error ? e.message : 'Sin conexión al backend' });
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Cotizaciones Generadas</span>
        {cotizaciones.length > 0 && (
          <div className="preview-stats">
            <span>{cotizaciones.length} cotizaciones</span>
          </div>
        )}
      </div>

      <div className="cotizaciones-body">
        {loading ? (
          <div className="preview-empty">
            <Loader size={32} color="#4f6ef7" />
            <p>Cargando cotizaciones...</p>
          </div>
        ) : cotizaciones.length === 0 ? (
          <div className="preview-empty">
            <FileText size={36} color="#434f66" />
            <p>Aún no se han generado cotizaciones.<br />Pídele al agente que genere una en el chat.</p>
          </div>
        ) : (
          <div className="cotizacion-list">
            {cotizaciones.map((c) => (
              <div className="cotizacion-card" key={c.folio}>
                <div className="cotizacion-main">
                  <div className="cotizacion-folio">{c.folio}</div>
                  <div className="cotizacion-cliente">{c.cliente || 'Sin cliente'}</div>
                  <div className="cotizacion-meta">
                    <span>{c.asesor || 'Sin asesor'}</span>
                    <span>·</span>
                    <span>{formatFecha(c.created_at)}</span>
                    <span>·</span>
                    <span>{c.productos_count} producto(s)</span>
                  </div>
                </div>
                <div className="cotizacion-total">
                  <span className="cotizacion-total-label">Total</span>
                  <span className="cotizacion-total-val">${formatCOP(c.total)} COP</span>
                </div>
                <div className="cotizacion-actions">
                  <button className="act-btn act-pdf" title="Abre el PDF de la cotización en una pestaña nueva" onClick={() => downloadPdf(c.folio)}>
                    <Download size={15} />
                    <span>PDF</span>
                  </button>
                  <button
                    className={`act-btn act-wa ${waFolio === c.folio ? 'active' : ''}`}
                    title="Enviar la cotización por WhatsApp al cliente"
                    onClick={() => openWaForm(c.folio)}
                  >
                    <WaIcon />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    className={`act-btn act-mail ${emailFolio === c.folio ? 'active' : ''}`}
                    title="Enviar la cotización por correo electrónico"
                    onClick={() => openEmailForm(c.folio)}
                  >
                    <Mail size={15} />
                    <span>Correo</span>
                  </button>
                </div>

                {waFolio === c.folio && (
                  <div className="cotizacion-send-form">
                    <span className="send-form-hint">Se enviará el PDF y el total al WhatsApp del cliente vía InboxCRM.</span>
                    <input
                      type="tel"
                      placeholder="Número WhatsApp — ej: 3001234567"
                      value={waTo}
                      onChange={(e) => setWaTo(e.target.value)}
                    />
                    <button className="primary-btn small wa-btn" disabled={waSending} onClick={() => sendWhatsApp(c.folio)}>
                      {waSending ? (<><Loader size={13} /> Enviando…</>) : (<><WaIcon size={13} /> Enviar por WhatsApp</>)}
                    </button>
                    {waResult && waResult.folio === c.folio && (
                      <span className={`send-result ${waResult.ok ? 'ok' : 'err'}`}>{waResult.msg}</span>
                    )}
                  </div>
                )}

                {emailFolio === c.folio && (
                  <div className="cotizacion-send-form">
                    <span className="send-form-hint">Se adjuntará el PDF de la cotización y se enviará con las credenciales SMTP configuradas.</span>
                    <input
                      type="email"
                      placeholder="correo@cliente.com"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                    />
                    <button className="primary-btn small" disabled={emailSending} onClick={() => sendEmail(c.folio)}>
                      {emailSending ? (<><Loader size={13} /> Enviando…</>) : (<><Send size={13} /> Enviar por correo</>)}
                    </button>
                    {emailResult && emailResult.folio === c.folio && (
                      <span className={`send-result ${emailResult.ok ? 'ok' : 'err'}`}>{emailResult.msg}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
