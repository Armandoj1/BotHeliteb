import { useState } from 'react';
import type { FormEvent } from 'react';

export default function LoginForm() {
  const [step, setStep] = useState<'telefono' | 'codigo'>('telefono');
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function solicitarCodigo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/solicitar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.motivo ?? 'No se pudo enviar el código.');
      setStep('codigo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function verificarCodigo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verificar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, codigo }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.motivo ?? 'Código incorrecto.');
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-logo">H</div>
      <h1>HELITEB Panel</h1>
      <p className="auth-sub">
        {step === 'telefono' ? 'Ingresa con tu WhatsApp de asesor' : 'Revisa tu correo para el código'}
      </p>
      {step === 'telefono' ? (
        <form onSubmit={solicitarCodigo}>
          <div className="field">
            <label>Teléfono de asesor</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="573..."
              required
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={verificarCodigo}>
          <div className="field">
            <label>Código de 6 dígitos (revisa tu correo)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="123456"
              required
              autoFocus
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
      )}
    </div>
  );
}
