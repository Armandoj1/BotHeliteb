import { useEffect, useState } from 'react';
import { CheckCircle2, Loader } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import type { Metrics } from '../lib/types';

export default function ConfiguracionForm() {
  const [configurado, setConfigurado] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<{ configurado: boolean }>('smtp-config').then((r) => setConfigurado(r.configurado)).catch(() => {});
    apiGet<Metrics>('metrics').then(setMetrics).catch(() => {});
  }, []);

  async function save() {
    if (!smtpUser.trim() || !smtpPassword.trim()) {
      alert('Completa al menos el usuario y la contraseña SMTP.');
      return;
    }
    setSaving(true);
    try {
      await apiPost('smtp-config', {
        smtp_host: smtpHost || 'smtp.gmail.com',
        smtp_port: Number(smtpPort) || 587,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        from_name: fromName || 'HELITEB SAS',
      });
      setConfigurado(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Configuración</span>
      </div>

      <div className="setup-body">
        <div className="setup-card">
          <h3>Correo (envío de cotizaciones)</h3>
          <p>
            Credenciales SMTP usadas para enviar cotizaciones por correo desde la pestaña Cotizaciones.
            {configurado && ' Ya hay credenciales guardadas — la contraseña no se vuelve a mostrar por seguridad.'}
          </p>

          <div className="asesor-form-grid">
            <div className="field">
              <label>Servidor SMTP</label>
              <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div className="field">
              <label>Puerto</label>
              <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
            </div>
            <div className="field">
              <label>Nombre del remitente</label>
              <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="HELITEB SAS" />
            </div>
            <div className="field">
              <label>Usuario / correo remitente</label>
              <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="ventas@heliteb.com" />
            </div>
            <div className="field">
              <label>Contraseña / App password</label>
              <input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          <button className={`primary-btn ${saved ? 'is-saved' : ''}`} disabled={saving} onClick={save}>
            {saving ? (<><Loader size={15} /> Guardando…</>) : saved ? (<><CheckCircle2 size={15} /> Guardado</>) : 'Guardar'}
          </button>
        </div>

        <div className="setup-card">
          <h3>Estado del sistema</h3>
          <p>Resumen en vivo de los datos que maneja el agente.</p>
          {metrics ? (
            <div className="metrics-grid">
              <div className="metric-chip">
                <div className="metric-value">{metrics.productos}</div>
                <div className="metric-label">Productos</div>
              </div>
              <div className="metric-chip">
                <div className="metric-value">{metrics.cotizaciones}</div>
                <div className="metric-label">Cotizaciones</div>
              </div>
              <div className="metric-chip">
                <div className="metric-value">{metrics.asesores}</div>
                <div className="metric-label">Asesores</div>
              </div>
            </div>
          ) : (
            <Loader size={20} color="#4f6ef7" />
          )}
        </div>

        <div className="setup-card">
          <h3>WhatsApp (InboxCRM)</h3>
          <p className="info-note">
            La conexión de WhatsApp con InboxCRM se gestiona directamente en InboxCRM y en las
            variables de entorno del servidor (API key, URL del workspace) — no requiere ninguna
            acción desde este panel.
          </p>
        </div>
      </div>
    </div>
  );
}
