import { useEffect, useState } from 'react';
import { Loader, Users, Plus, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import type { Asesor } from '../lib/types';

export default function AsesoresManager() {
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    setLoading(true);
    apiGet<Asesor[]>('asesores').then(setAsesores).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create() {
    if (!nombre.trim() || !email.trim() || !telefono.trim()) {
      setMsg({ ok: false, text: 'Completa nombre, correo y teléfono.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await apiPost('asesores', { nombre, email, telefono });
      setMsg({ ok: true, text: 'Asesor guardado. Ya puede cotizar desde su WhatsApp.' });
      setNombre('');
      setEmail('');
      setTelefono('');
      load();
    } catch {
      setMsg({ ok: false, text: 'No se pudo guardar el asesor.' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: Asesor) {
    if (!confirm(`¿Eliminar al asesor ${a.nombre}?`)) return;
    try {
      await apiDelete(`asesores/${a.id}`);
      load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Asesores</span>
        {asesores.length > 0 && (
          <div className="preview-stats"><span>{asesores.length} asesores</span></div>
        )}
      </div>

      <div className="asesores-body">
        <p className="asesores-intro">
          Solo los asesores registrados pueden generar cotizaciones por WhatsApp. Al cotizar, el bot
          verifica su identidad con un código enviado a su correo, y toma el nombre del asesor
          automáticamente (no lo pregunta).
        </p>

        <div className="asesor-form-card">
          <h3><Plus size={15} /> Nuevo asesor</h3>
          <div className="asesor-form-grid">
            <div className="field">
              <label>Nombre completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María Gómez" />
            </div>
            <div className="field">
              <label>Correo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="asesor@correo.com" />
            </div>
            <div className="field">
              <label>WhatsApp (con indicativo)</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 3001234567" />
            </div>
          </div>
          <button className="primary-btn small" disabled={saving} onClick={create}>
            {saving ? (<><Loader size={14} /> Guardando…</>) : (<><Plus size={14} /> Agregar asesor</>)}
          </button>
          {msg && <span className={`asesor-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
        </div>

        {loading ? (
          <div className="preview-empty">
            <Loader size={32} color="#4f6ef7" />
            <p>Cargando asesores…</p>
          </div>
        ) : asesores.length === 0 ? (
          <div className="preview-empty">
            <Users size={36} color="#434f66" />
            <p>Aún no hay asesores.<br />Agrega el primero arriba.</p>
          </div>
        ) : (
          <div className="asesor-list">
            {asesores.map((a) => (
              <div className="asesor-card" key={a.id}>
                <div className="asesor-avatar">{a.nombre.charAt(0)}</div>
                <div className="asesor-main">
                  <div className="asesor-nombre">{a.nombre}</div>
                  <div className="asesor-meta">
                    <span>{a.email}</span><span>·</span><span>+{a.telefono}</span>
                  </div>
                </div>
                <div className="asesor-estado">
                  {a.verificado ? (
                    <span className="badge ok"><ShieldCheck size={13} /> Verificado</span>
                  ) : (
                    <span className="badge idle"><ShieldAlert size={13} /> Sin verificar</span>
                  )}
                </div>
                <button className="icon-btn danger" title="Eliminar" onClick={() => remove(a)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
