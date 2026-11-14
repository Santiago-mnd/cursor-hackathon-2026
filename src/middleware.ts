import { defineMiddleware } from 'astro:middleware';
import { readSession } from './lib/session';

const PROTECTED_PAGES = ['/cobrar', '/cobros', '/cuenta'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isPage = PROTECTED_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isApi = pathname.startsWith('/api/charges');
  if (!isPage && !isApi && pathname !== '/' && pathname !== '/entrar') return next();

  const user = await readSession(context.cookies);
  if (user) context.locals.user = user;
  if ((isPage || isApi) && !user) {
    if (isApi) return Response.json({ error: 'Entra con Google para cobrar.' }, { status: 401 });
    return context.redirect(`/entrar?next=${encodeURIComponent(pathname)}`);
  }
  return next();
});
