import { Webhook } from 'standardwebhooks';
import { PEY_WEBHOOK_SECRET } from 'astro:env/server';

export interface PeyEvent {
  type: string;
  data: Record<string, unknown>;
}

export function verifyPeyEvent(payload: string, headers: Headers): PeyEvent {
  if (!PEY_WEBHOOK_SECRET) throw new Error('Falta PEY_WEBHOOK_SECRET');
  const webhook = new Webhook(PEY_WEBHOOK_SECRET);
  return webhook.verify(payload, {
    'webhook-id': headers.get('webhook-id') ?? '',
    'webhook-timestamp': headers.get('webhook-timestamp') ?? '',
    'webhook-signature': headers.get('webhook-signature') ?? '',
  }) as PeyEvent;
}

export function peyRefFromEvent(event: PeyEvent): string | null {
  const data = event.data;
  const candidates = [data['codiQrId'], data['transactionId']];
  const found = candidates.find((value): value is string => typeof value === 'string' && value.length > 0);
  return found ?? null;
}
