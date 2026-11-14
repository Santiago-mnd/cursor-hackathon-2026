import type { APIRoute } from 'astro';
import { effectiveStatus } from '../../../lib/charge';
import { isPaidOnPey } from '../../../lib/pey';
import { getStore } from '../../../lib/store';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const store = await getStore();
  const charge = await store.get(params.id ?? '');
  if (!charge || charge.vendorId !== locals.user?.uid) return Response.json({ error: 'No existe ese cobro' }, { status: 404 });
  if (effectiveStatus(charge) === 'waiting') {
    try {
      if (await isPaidOnPey(charge.method, charge.peyRef)) {
        const paidAt = Date.now();
        await store.markPaid(charge.id, paidAt);
        return Response.json({ id: charge.id, status: 'paid', paidAt });
      }
    } catch (error) {
      console.error('pey consulta', error);
    }
  }
  return Response.json({ id: charge.id, status: effectiveStatus(charge), paidAt: charge.paidAt ?? null });
};
