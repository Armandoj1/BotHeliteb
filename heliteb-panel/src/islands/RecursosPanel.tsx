import { useEffect, useState } from 'react';
import { Loader, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { apiGet } from '../lib/api';
import type { RecursosResponse } from '../lib/types';

function pct(usado: number | null, total: number | null): number {
  if (!usado || !total) return 0;
  return Math.min(100, Math.round((usado / total) * 100));
}

function barClass(p: number): string {
  if (p >= 90) return 'danger';
  if (p >= 70) return 'warn';
  return '';
}

export default function RecursosPanel() {
  const [data, setData] = useState<RecursosResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<RecursosResponse>('system/recursos').then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Recursos del servidor</span></div>
        <div className="preview-empty"><Loader size={28} color="#4f6ef7" /></div>
      </div>
    );
  }

  if (!data || !data.actual.disponible) {
    return (
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Recursos del servidor</span></div>
        <div className="preview-empty">
          <p>No se pudo leer el uso de recursos en este entorno.<br />(Disponible solo cuando el backend corre en Linux, ej. el VPS de producción.)</p>
        </div>
      </div>
    );
  }

  const { actual, historico_24h } = data;
  const ramPct = pct(actual.ram_usado_mb, actual.ram_total_mb);
  const discoPct = pct(actual.disco_usado_gb, actual.disco_total_gb);
  const maxRam = Math.max(1, ...historico_24h.map((m) => m.ram_usado_mb ?? 0));

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Recursos del servidor</span>
      </div>

      <div className="recursos-body">
        <div className="recursos-grid">
          <div className="recurso-card">
            <div className="recurso-card-label"><MemoryStick size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />RAM</div>
            <div className="recurso-card-value">{ramPct}%</div>
            <div className="recurso-card-sub">{actual.ram_usado_mb} MB / {actual.ram_total_mb} MB</div>
            <div className="recurso-bar"><div className={`recurso-bar-fill ${barClass(ramPct)}`} style={{ width: `${ramPct}%` }} /></div>
          </div>
          <div className="recurso-card">
            <div className="recurso-card-label"><HardDrive size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Disco</div>
            <div className="recurso-card-value">{discoPct}%</div>
            <div className="recurso-card-sub">{actual.disco_usado_gb} GB / {actual.disco_total_gb} GB</div>
            <div className="recurso-bar"><div className={`recurso-bar-fill ${barClass(discoPct)}`} style={{ width: `${discoPct}%` }} /></div>
          </div>
          <div className="recurso-card">
            <div className="recurso-card-label"><Cpu size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Carga CPU (1 min)</div>
            <div className="recurso-card-value">{actual.cpu_load1m?.toFixed(2) ?? '—'}</div>
            <div className="recurso-card-sub">Promedio de procesos esperando CPU</div>
          </div>
        </div>

        <div className="recursos-historico">
          <h3>Uso de RAM — últimas 24 horas ({historico_24h.length} muestras, cada 15 min)</h3>
          {historico_24h.length === 0 ? (
            <p className="recursos-chart-empty">Todavía no hay suficientes muestras acumuladas.</p>
          ) : (
            <div className="recursos-chart">
              {historico_24h.map((m, i) => (
                <div
                  key={i}
                  className="recursos-chart-bar"
                  title={`${new Date(m.medido_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} — ${m.ram_usado_mb} MB`}
                  style={{ height: `${Math.max(2, ((m.ram_usado_mb ?? 0) / maxRam) * 100)}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
