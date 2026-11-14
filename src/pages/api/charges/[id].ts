import type { APIRoute } from 'astro';
import { effectiveStatus } from '../../../lib/charge';
import { getStore } from '../../../lib/store';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const store = await getStore();
  const charge = await store.get(params.id ?? '');
  if (!charge) return Response.json({ error: 'No existe ese cobro' }, { status: 404 });
  return Response.json({ id: charge.id, status: effectiveStatus(charge), paidAt: charge.paidAt ?? null });
};
