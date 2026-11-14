import { Webhook } from 'standardwebhooks';
import { PEY_WEBHOOK_SECRET } from 'astro:env/server';

export interface PeyEvent {
  type: string;
  data: Record<string, unknown>;
}

export function verifyPeyEvent(payload: string, headers: Headers): PeyEvent {
  const webhook = new Webhook(PEY_WEBHOOK_SECRET);
  return webhook.verify(payload, {
    'webhook-id': headers.get('webhook-id') ?? '',
    'webhook-timestamp': headers.get('webhook-timestamp') ?? '',
    'webhook-signature': headers.get('webhook-signature') ?? '',
  }) as PeyEvent;
}
