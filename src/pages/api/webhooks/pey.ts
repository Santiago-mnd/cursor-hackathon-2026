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

  try {
    const store = await getStore();
    if (await store.hasEvent(webhookId)) return new Response('duplicado', { status: 200 });

    if (PAID_EVENTS.has(event.type)) {
      const peyRef = peyRefFromEvent(event);
      const charge = peyRef ? await store.findByPeyRef(peyRef) : null;
      if (charge) await store.markPaid(charge.id, Date.now());
      else console.warn('webhook sin cobro', event.type, peyRef);
    }
    await store.recordEvent(webhookId, event);
    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('webhook pey', webhookId, error);
    return new Response('error al procesar; reintenta', { status: 500 });
  }
};
