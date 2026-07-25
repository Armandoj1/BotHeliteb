import { useEffect, useState } from 'react';
import { Mail, Phone, ShieldCheck, ShieldAlert, CalendarDays, LogOut, Loader, Pencil, X, Check } from 'lucide-react';
import { apiGet, apiPatch } from '../lib/api';
import type { Asesor } from '../lib/types';

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ProfilePanel() {
  const [perfil, setPerfil] = useState<Asesor | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Asesor>('auth/me').then(setPerfil).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function startEdit() {
    if (!perfil) return;
    setEditNombre(perfil.nombre);
    setEditEmail(perfil.email);
    setError(null);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editNombre.trim() || !editEmail.trim()) {
      setError('Nombre y correo son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const actualizado = await apiPatch<Asesor>('auth/me', { nombre: editNombre.trim(), email: editEmail.trim() });
      setPerfil(actualizado);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Perfil</span></div>
        <div className="preview-empty"><Loader size={28} color="#4f6ef7" /></div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Perfil</span></div>
        <div className="preview-empty"><p>No se pudo cargar tu perfil.</p></div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Perfil</span>
      </div>

      <div className="profile-body">
        <div className="profile-hero">
          <div className="profile-avatar-lg">{perfil.nombre.charAt(0)}</div>
          <div className="profile-hero-main">
            <div className="profile-name">{perfil.nombre}</div>
            <div className="profile-badges">
              {perfil.verificado ? (
                <span className="badge ok"><ShieldCheck size={13} /> Verificado</span>
              ) : (
                <span className="badge idle"><ShieldAlert size={13} /> Sin verificar</span>
              )}
              {!perfil.activo && <span className="badge idle">Inactivo</span>}
            </div>
          </div>
          {!editing && (
            <button className="outline-btn" onClick={startEdit}>
              <Pencil size={13} /> Editar información
            </button>
          )}
        </div>

        {editing ? (
          <div className="asesor-form-card" style={{ marginBottom: 20 }}>
            <h3>Editar información</h3>
            <div className="asesor-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>Nombre completo</label>
                <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
              </div>
              <div className="field">
                <label>Correo</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
            </div>
            {error && <p className="field-error">{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary-btn small" disabled={saving} onClick={saveEdit}>
                {saving ? (<><Loader size={13} /> Guardando…</>) : (<><Check size={13} /> Guardar</>)}
              </button>
              <button className="outline-btn" disabled={saving} onClick={() => setEditing(false)}>
                <X size={13} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info-grid">
            <div className="profile-info-card">
              <div className="profile-info-icon"><Mail size={16} /></div>
              <div>
                <div className="profile-info-label">Correo</div>
                <div className="profile-info-value">{perfil.email}</div>
              </div>
            </div>
            <div className="profile-info-card">
              <div className="profile-info-icon"><Phone size={16} /></div>
              <div>
                <div className="profile-info-label">WhatsApp</div>
                <div className="profile-info-value">+{perfil.telefono}</div>
              </div>
            </div>
            <div className="profile-info-card">
              <div className="profile-info-icon"><CalendarDays size={16} /></div>
              <div>
                <div className="profile-info-label">Asesor desde</div>
                <div className="profile-info-value">{formatFecha(perfil.created_at)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="profile-actions">
          <h3>Sesión</h3>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
