import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { telefono, codigo } = await request.json();

  const response = await fetch(
    `${process.env.API_URL}/api/auth/verificar-codigo?telefono=${encodeURIComponent(telefono)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    },
  );
  // El backend puede responder sin cuerpo JSON (ej. un 500 sin manejar) - no asumir
  // que siempre hay un body parseable.
  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (data === null) {
    data = { ok: false, motivo: `El backend respondió ${response.status} sin detalle.` };
  }

  // El API .NET nunca pone la cookie el mismo (viviria en su propio dominio/puerto,
  // inutil para este middleware) - Astro la pone aqui, httpOnly, tras confirmar el OTP.
  if (response.ok && data.ok && data.token) {
    cookies.set('heliteb_session', data.token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 3600,
    });
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
