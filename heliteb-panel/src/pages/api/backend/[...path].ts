import type { APIRoute } from 'astro';

/// <summary>
/// Proxy autenticado servidor-a-servidor hacia el API .NET real: agrega el JWT como
/// header Authorization (el navegador nunca lo ve, vive en la cookie httpOnly) y
/// reenvia metodo/cuerpo/query tal cual. Esto es lo que hace que el API .NET ya no
/// necesite CORS para el panel - todo pasa por aqui, no directo desde el navegador.
/// </summary>
export const ALL: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get('heliteb_session')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const path = params.path ?? '';
  const search = new URL(request.url).search;
  const target = `${process.env.API_URL}/api/${path}${search}`;

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.delete('host');
  headers.delete('cookie');
  headers.delete('content-length');

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};
