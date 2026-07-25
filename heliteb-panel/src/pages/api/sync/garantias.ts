import type { APIRoute } from 'astro';

// Dispara manualmente el workflow de n8n "Chequeo Politicas de Garantia" via su webhook.
export const POST: APIRoute = async () => {
  try {
    const response = await fetch(`${process.env.N8N_BASE_URL}/webhook/sync-garantias-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const raw = await response.text();
    if (!response.ok) {
      return new Response(
        JSON.stringify({ ok: false, motivo: `n8n respondió ${response.status}. ¿El workflow ya está activo?` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { mensaje: raw };
    }

    return new Response(JSON.stringify({ ok: true, resultado: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(
      JSON.stringify({ ok: false, motivo: 'No se pudo conectar con n8n.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
