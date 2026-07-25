import { defineMiddleware } from 'astro:middleware';
import { jwtVerify } from 'jose';

// Rutas que no requieren sesion: la pantalla de login y las llamadas server-to-server
// que hacen el login mismo (piden/verifican el codigo OTP contra el API .NET).
const PUBLIC_PATHS = ['/login', '/api/auth/solicitar-codigo', '/api/auth/verificar-codigo', '/api/auth/logout'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return next();
  }

  const token = context.cookies.get('heliteb_session')?.value;
  if (!token) {
    return context.redirect('/login');
  }

  try {
    // process.env (no import.meta.env): estas variables deben leerse en tiempo de
    // ejecucion, no quedar horneadas en el build - la misma imagen Docker se corre
    // con distintos secretos segun el entorno (dev/VPS) via variables de docker-compose.
    const signingKey = new TextEncoder().encode(process.env.JWT_SIGNING_KEY);
    const { payload } = await jwtVerify(token, signingKey, {
      issuer: 'heliteb-api',
      audience: 'heliteb-panel',
    });

    context.locals.asesor = {
      id: String(payload.sub ?? ''),
      nombre: String(payload.name ?? ''),
      telefono: String(payload.phone ?? ''),
    };
  } catch {
    // Token vencido o invalido - se limpia la cookie para no quedar en un loop de
    // intentos fallidos silenciosos en cada request.
    context.cookies.delete('heliteb_session', { path: '/' });
    return context.redirect('/login');
  }

  return next();
});
