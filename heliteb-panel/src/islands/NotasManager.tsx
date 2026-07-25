import { useEffect, useState } from 'react';
import { Loader, StickyNote, Plus, Trash2, Power, PowerOff } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';
import type { AgenteNota } from '../lib/types';

export default function NotasManager() {
  const [notas, setNotas] = useState<AgenteNota[]>([]);
  const [loading, setLoading] = useState(true);
  const [contenido, setContenido] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    apiGet<AgenteNota[]>('agente-notas').then(setNotas).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create() {
    if (!contenido.trim()) return;
    setSaving(true);
    try {
      await apiPost('agente-notas', { contenido: contenido.trim() });
      setContenido('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(n: AgenteNota) {
    await apiPatch(`agente-notas/${n.id}/${n.activo ? 'desactivar' : 'activar'}`);
    load();
  }

  async function remove(n: AgenteNota) {
    if (!confirm('¿Eliminar esta nota?')) return;
    await apiDelete(`agente-notas/${n.id}`);
    load();
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Notas del agente</span>
        {notas.length > 0 && <div className="preview-stats"><span>{notas.length} notas</span></div>}
      </div>

      <div className="notas-body">
        <p className="notas-intro">
          Reglas o instrucciones de negocio que se inyectan en cada conversación del agente
          (ej: "siempre menciona la garantía de 1 año"). Se aplican al instante, sin tocar código
          ni redesplegar. Las notas desactivadas dejan de enviarse al agente pero quedan guardadas.
        </p>

        <div className="nota-form-card">
          <div className="field">
            <label>Nueva nota</label>
            <textarea
              rows={3}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Ej: Los envíos a Bogotá tardan 2 días hábiles."
            />
          </div>
          <button className="primary-btn small" disabled={saving || !contenido.trim()} onClick={create}>
            {saving ? (<><Loader size={14} /> Guardando…</>) : (<><Plus size={14} /> Agregar nota</>)}
          </button>
        </div>

        {loading ? (
          <div className="preview-empty">
            <Loader size={32} color="#4f6ef7" />
            <p>Cargando notas…</p>
          </div>
        ) : notas.length === 0 ? (
          <div className="preview-empty">
            <StickyNote size={36} color="#434f66" />
            <p>Aún no hay notas para el agente.<br />Agrega la primera arriba.</p>
          </div>
        ) : (
          <div className="nota-list">
            {notas.map((n) => (
              <div className={`nota-card ${n.activo ? '' : 'inactive'}`} key={n.id}>
                <div>
                  <div className="nota-contenido">{n.contenido}</div>
                  <div className="nota-meta">{n.activo ? 'Activa' : 'Desactivada'} · {new Date(n.created_at).toLocaleDateString('es-CO')}</div>
                </div>
                <div className="nota-actions">
                  <button className="icon-btn" title={n.activo ? 'Desactivar' : 'Activar'} onClick={() => toggle(n)}>
                    {n.activo ? <PowerOff size={14} /> : <Power size={14} />}
                  </button>
                  <button className="icon-btn danger" title="Eliminar" onClick={() => remove(n)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
