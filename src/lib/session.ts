import type { AstroCookies } from 'astro';
import { FIREBASE_SERVICE_ACCOUNT } from 'astro:env/server';

export interface SessionUser {
  uid: string;
  name: string;
  email: string;
  picture?: string;
}

export const SESSION_COOKIE = 'deuna_session';
const SESSION_MS = 5 * 24 * 60 * 60 * 1000;
const RECENT_SIGN_IN_SECONDS = 5 * 60;

export const authEnabled = Boolean(FIREBASE_SERVICE_ACCOUNT);

export const LOCAL_USER: SessionUser = { uid: 'local', name: 'Modo local', email: '' };

async function adminAuth() {
  const { auth } = await import('./firebase/admin');
  return auth;
}

export async function startSession(idToken: string, cookies: AstroCookies, secure: boolean): Promise<SessionUser> {
  const auth = await adminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (Date.now() / 1000 - decoded.auth_time > RECENT_SIGN_IN_SECONDS) throw new Error('inicio de sesión viejo');
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MS });
  cookies.set(SESSION_COOKIE, cookie, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MS / 1000,
  });
  return { uid: decoded.uid, name: decoded['name'] ?? '', email: decoded.email ?? '', picture: decoded.picture };
}

export async function readSession(cookies: AstroCookies): Promise<SessionUser | null> {
  if (!authEnabled) return LOCAL_USER;
  const value = cookies.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const auth = await adminAuth();
    const decoded = await auth.verifySessionCookie(value);
    return { uid: decoded.uid, name: decoded['name'] ?? '', email: decoded.email ?? '', picture: decoded.picture };
  } catch {
    return null;
  }
}

export function endSession(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/cobrar';
  return value;
}
