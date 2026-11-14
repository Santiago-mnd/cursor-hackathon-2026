import { PEY_API_KEY, PEY_API_URL, PEY_BANK_ACCOUNT_ID, PEY_MOCK } from 'astro:env/server';

type Metadata = Record<string, string | number | boolean | null>;

export interface CreateQrInput {
  amount: number;
  concept?: string;
  expiration?: number;
  numRef?: string;
  bankAccountId?: string;
  metadata?: Metadata;
}

export interface CreateQrResult {
  id: string;
  qrString: string;
}

export interface CreatePushInput {
  amount: number;
  phoneNumber: string;
  concept?: string;
  expiration?: number;
  numRef?: string;
  bankAccountId?: string;
  metadata?: Metadata;
}

export interface CreatePushResult {
  transactionId: string;
  codiId: string;
}

export class PeyError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`pey respondió ${status}`);
  }
}

export const peyMock = PEY_MOCK;

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!PEY_API_KEY) throw new PeyError(503, { error: 'Falta PEY_API_KEY y PEY_MOCK no está activo' });
  const response = await fetch(new URL(path, PEY_API_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PEY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(PEY_BANK_ACCOUNT_ID ? { ...body, bankAccountId: PEY_BANK_ACCOUNT_ID } : body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new PeyError(response.status, data);
  return data as T;
}

export async function createQr(input: CreateQrInput): Promise<CreateQrResult> {
  if (peyMock) {
    const id = `MOCK${Date.now().toString(36).toUpperCase()}`;
    return { id, qrString: JSON.stringify({ TYP: 1, v: '01', ic: 0, IDC: id, mock: true }) };
  }
  return request('/codi/qr', { ...input });
}

export async function createPush(input: CreatePushInput): Promise<CreatePushResult> {
  if (peyMock) {
    return { transactionId: `MOCK${Date.now().toString(36).toUpperCase()}`, codiId: '0' };
  }
  return request('/codi/pn', { ...input });
}

interface PeyTransaction {
  id: string;
  status: 'PENDING' | 'PAID';
  amount: number;
}

async function read<T>(path: string): Promise<T> {
  if (!PEY_API_KEY) throw new PeyError(503, { error: 'Falta PEY_API_KEY' });
  const response = await fetch(new URL(path, PEY_API_URL), { headers: { Authorization: `Bearer ${PEY_API_KEY}` } });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new PeyError(response.status, data);
  return data as T;
}

export async function isPaidOnPey(method: 'qr' | 'phone', peyRef: string): Promise<boolean> {
  if (peyMock || !PEY_API_KEY) return false;
  if (method === 'qr') {
    const data = await read<{ items?: PeyTransaction[] }>(`/transaction/codi/qr/${encodeURIComponent(peyRef)}`);
    return (data.items ?? []).some((transaction) => transaction.status === 'PAID');
  }
  const transaction = await read<PeyTransaction>(`/transaction/${encodeURIComponent(peyRef)}`);
  return transaction.status === 'PAID';
}
