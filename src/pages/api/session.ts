import type { APIRoute } from 'astro';
import { authEnabled, endSession, startSession } from '../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!authEnabled) return Response.json({ ok: true });
  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  if (typeof body?.idToken !== 'string') return Response.json({ error: 'Falta el token' }, { status: 400 });
  try {
    await startSession(body.idToken, cookies, url.protocol === 'https:');
    return Response.json({ ok: true });
  } catch (error) {
    console.error('sesión', error);
    return Response.json({ error: 'No se pudo iniciar sesión.' }, { status: 401 });
  }
};

export const DELETE: APIRoute = ({ cookies }) => {
  endSession(cookies);
  return new Response(null, { status: 204 });
};
