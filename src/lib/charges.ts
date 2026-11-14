import QRCode from 'qrcode';
import { PEY_CHARGE_CAP } from 'astro:env/server';
import { CHARGE_TTL_SECONDS, type Charge, type ChargeMethod } from './charge';
import { createPush, createQr } from './pey';
import { getStore } from './store';

export const chargeCap: number | null = PEY_CHARGE_CAP && PEY_CHARGE_CAP > 0 ? PEY_CHARGE_CAP : null;

export interface NewChargeInput {
  amount: number;
  concept: string;
  method: ChargeMethod;
  phoneNumber?: string;
}

export class ChargeInputError extends Error {}

export function parseNewCharge(body: unknown): NewChargeInput {
  if (typeof body !== 'object' || body === null) throw new ChargeInputError('Datos inválidos');
  const raw = body as Record<string, unknown>;
  const amount = Math.round(Number(raw['amount']) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw new ChargeInputError('Ingresa un monto mayor a cero.');
  }
  const method = raw['method'];
  if (method !== 'qr' && method !== 'phone') throw new ChargeInputError('Elige cómo quieres cobrar.');
  const concept = typeof raw['concept'] === 'string' ? raw['concept'].trim().slice(0, 60) : '';
  const phoneNumber = typeof raw['phoneNumber'] === 'string' ? raw['phoneNumber'].replace(/\D/g, '') : undefined;
  if (method === 'phone' && (!phoneNumber || phoneNumber.length !== 10)) {
    throw new ChargeInputError('Escribe 10 dígitos');
  }
  return { amount, concept, method, phoneNumber };
}

export async function createCharge(input: NewChargeInput, vendorId: string): Promise<Charge> {
  const now = Date.now();
  const chargedAmount = chargeCap === null ? input.amount : Math.min(input.amount, chargeCap);
  const base = {
    id: crypto.randomUUID(),
    vendorId,
    amount: input.amount,
    chargedAmount,
    concept: input.concept,
    method: input.method,
    status: 'waiting' as const,
    createdAt: now,
    expiresAt: now + CHARGE_TTL_SECONDS * 1000,
  };
  const concept = input.concept || 'Cobro DeUna';
  let charge: Charge;
  if (input.method === 'qr') {
    const qr = await createQr({ amount: chargedAmount, concept, expiration: CHARGE_TTL_SECONDS });
    const qrSvg = await QRCode.toString(qr.qrString, { type: 'svg', margin: 0, color: { dark: '#212529', light: '#ffffff' } });
    charge = { ...base, peyRef: qr.id, qrSvg };
  } else {
    const push = await createPush({
      amount: chargedAmount,
      phoneNumber: input.phoneNumber!,
      concept,
      expiration: CHARGE_TTL_SECONDS,
    });
    charge = { ...base, peyRef: push.transactionId, phoneLast4: input.phoneNumber!.slice(-4) };
  }
  const store = await getStore();
  await store.save(charge);
  return charge;
}
