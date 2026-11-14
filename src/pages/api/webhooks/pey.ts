import type { APIRoute } from 'astro';
import { getStore } from '../../../lib/store';
import { peyRefFromEvent, verifyPeyEvent, type PeyEvent } from '../../../lib/webhook';

export const prerender = false;

const PAID_EVENTS = new Set(['codi.qr.payment_received', 'codi.pn.payment_received']);

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.text();
  const webhookId = request.headers.get('webhook-id');
  let event: PeyEvent;
  try {
    event = verifyPeyEvent(payload, request.headers);
  } catch {
    return new Response('firma inválida', { status: 401 });
  }
  if (!webhookId) return new Response('falta webhook-id', { status: 400 });

  const store = await getStore();
  const isNew = await store.recordEvent(webhookId, event);
  if (!isNew) return new Response('duplicado', { status: 200 });

  if (PAID_EVENTS.has(event.type)) {
    const peyRef = peyRefFromEvent(event);
    const charge = peyRef ? await store.findByPeyRef(peyRef) : null;
    if (charge) await store.markPaid(charge.id, Date.now());
    else console.warn('webhook sin cobro', event.type, peyRef);
  }
  return new Response('ok', { status: 200 });
};
