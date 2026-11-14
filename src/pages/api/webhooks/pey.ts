import type { APIRoute } from 'astro';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../../../lib/firebase/admin';
import { verifyPeyEvent, type PeyEvent } from '../../../lib/webhook';

export const prerender = false;

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

  const eventRef = db.collection('webhookEvents').doc(webhookId);
  const created = await eventRef
    .create({ type: event.type, data: event.data, receivedAt: FieldValue.serverTimestamp() })
    .then(() => true)
    .catch(() => false);

  return new Response(created ? 'ok' : 'duplicado', { status: 200 });
};
