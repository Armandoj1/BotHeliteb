import { useState } from 'react';
import { MapPin, ShieldCheck, Loader, PlayCircle } from 'lucide-react';

interface SedesResultado {
  insertadas: number;
  actualizadas: number;
  sin_cambios: number;
  no_encontradas_en_sheet: string[];
}

interface GarantiasResultado {
  cambio: boolean;
  primera_vez?: boolean;
  archivo: string;
  modificado_en: string;
  lineas_agregadas?: string[];
  lineas_eliminadas?: string[];
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Estado<T> = { ok: boolean; motivo?: string; resultado?: T } | null;

export default function SyncPanel() {
  const [sedesLoading, setSedesLoading] = useState(false);
  const [sedesEstado, setSedesEstado] = useState<Estado<SedesResultado>>(null);

  const [garantiasLoading, setGarantiasLoading] = useState(false);
  const [garantiasEstado, setGarantiasEstado] = useState<Estado<GarantiasResultado>>(null);

  async function sincronizarSedes() {
    setSedesLoading(true);
    setSedesEstado(null);
    try {
      const res = await fetch('/api/sync/sedes', { method: 'POST' });
      const data = await res.json();
      setSedesEstado(data);
    } catch {
      setSedesEstado({ ok: false, motivo: 'Error de red.' });
    } finally {
      setSedesLoading(false);
    }
  }

  async function verificarGarantias() {
    setGarantiasLoading(true);
    setGarantiasEstado(null);
    try {
      const res = await fetch('/api/sync/garantias', { method: 'POST' });
      const data = await res.json();
      setGarantiasEstado(data);
    } catch {
      setGarantiasEstado({ ok: false, motivo: 'Error de red.' });
    } finally {
      setGarantiasLoading(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Sincronización</span>
      </div>

      <div className="sync-body">
        <div className="sync-card">
          <div className="sync-card-icon"><MapPin size={18} /></div>
          <h3>Sedes</h3>
          <p>
            Lee el Sheet de sedes y actualiza la base de datos: agrega sedes nuevas y actualiza
            teléfonos que cambiaron. Nunca borra una sede automáticamente. También corre solo,
            todos los días a las 7:00 AM.
          </p>
          <button className="primary-btn small" disabled={sedesLoading} onClick={sincronizarSedes} style={{ alignSelf: 'flex-start' }}>
            {sedesLoading ? (<><Loader size={13} /> Sincronizando…</>) : (<><PlayCircle size={13} /> Sincronizar ahora</>)}
          </button>
          {sedesEstado && (
            sedesEstado.ok && sedesEstado.resultado ? (
              <div className="sync-result ok">
                {sedesEstado.resultado.insertadas} nuevas · {sedesEstado.resultado.actualizadas} actualizadas · {sedesEstado.resultado.sin_cambios} sin cambios
                {sedesEstado.resultado.no_encontradas_en_sheet?.length > 0 && (
                  <><br />⚠ No aparecen en el Sheet ({sedesEstado.resultado.no_encontradas_en_sheet.length}): {sedesEstado.resultado.no_encontradas_en_sheet.join(', ')}</>
                )}
              </div>
            ) : (
              <div className="sync-result err">{sedesEstado.motivo ?? 'No se pudo sincronizar.'}</div>
            )
          )}
        </div>

        <div className="sync-card">
          <div className="sync-card-icon"><ShieldCheck size={18} /></div>
          <h3>Políticas de garantía</h3>
          <p>
            Revisa si el archivo de políticas de garantía en Drive cambió desde la última
            verificación. Si cambió, avisa por correo — no reescribe la base de datos
            automáticamente (es contenido sin estructura, se revisa a mano). También corre solo,
            todos los días a las 7:05 AM.
          </p>
          <button className="primary-btn small" disabled={garantiasLoading} onClick={verificarGarantias} style={{ alignSelf: 'flex-start' }}>
            {garantiasLoading ? (<><Loader size={13} /> Verificando…</>) : (<><PlayCircle size={13} /> Verificar ahora</>)}
          </button>
          {garantiasEstado && (
            garantiasEstado.ok && garantiasEstado.resultado ? (
              <div className="sync-result ok">
                <strong>{garantiasEstado.resultado.archivo}</strong>
                <br />
                {garantiasEstado.resultado.cambio ? (
                  <>
                    ⚠ Cambió {garantiasEstado.resultado.primera_vez ? '(primera verificación registrada, sin versión anterior para comparar)' : '— se envió un correo de aviso con el detalle'}.
                    <br />
                    Modificado: {formatFechaHora(garantiasEstado.resultado.modificado_en)}
                    {!garantiasEstado.resultado.primera_vez && (
                      <div className="diff-box">
                        {garantiasEstado.resultado.lineas_agregadas?.map((l, i) => (
                          <div key={`a${i}`} className="diff-line added">+ {l}</div>
                        ))}
                        {garantiasEstado.resultado.lineas_eliminadas?.map((l, i) => (
                          <div key={`d${i}`} className="diff-line removed">− {l}</div>
                        ))}
                        {!garantiasEstado.resultado.lineas_agregadas?.length && !garantiasEstado.resultado.lineas_eliminadas?.length && (
                          <div className="diff-line">El archivo se guardó de nuevo pero el texto no cambió.</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>Sin cambios desde la última verificación ({formatFechaHora(garantiasEstado.resultado.modificado_en)}).</>
                )}
              </div>
            ) : (
              <div className="sync-result err">{garantiasEstado.motivo ?? 'No se pudo verificar.'}</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
