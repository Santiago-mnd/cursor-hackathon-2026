import type { APIRoute } from 'astro';
import { peyMock } from '../../../../lib/pey';
import { getStore } from '../../../../lib/store';

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
  if (!peyMock) return new Response('Solo en modo simulado', { status: 404 });
  const store = await getStore();
  const charge = await store.get(params.id ?? '');
  if (!charge || charge.vendorId !== locals.user?.uid) return new Response('No existe ese cobro', { status: 404 });
  await store.markPaid(charge.id, Date.now());
  return Response.json({ ok: true });
};
