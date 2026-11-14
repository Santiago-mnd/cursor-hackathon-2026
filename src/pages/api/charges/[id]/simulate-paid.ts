import type { APIRoute } from 'astro';
import { peyMock } from '../../../../lib/pey';
import { getStore } from '../../../../lib/store';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  if (!peyMock) return new Response('Solo en modo simulado', { status: 404 });
  const store = await getStore();
  await store.markPaid(params.id ?? '', Date.now());
  return Response.json({ ok: true });
};
