import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const { telefono } = await request.json();

  const response = await fetch(
    `${process.env.API_URL}/api/auth/solicitar-codigo?telefono=${encodeURIComponent(telefono)}`,
    { method: 'POST' },
  );
  // El backend puede responder sin cuerpo JSON (ej. un 500 sin manejar) - no asumir
  // que siempre hay un body parseable.
  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (data === null) {
    data = { ok: false, motivo: `El backend respondió ${response.status} sin detalle.` };
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
