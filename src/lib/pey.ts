import { PEY_API_KEY, PEY_API_URL } from 'astro:env/server';

type Metadata = Record<string, string | number | boolean | null>;

export interface CreateQrInput {
  amount: number;
  concept?: string;
  expiration?: number;
  numRef?: string;
  generateImage?: boolean;
  bankAccountId?: string;
  metadata?: Metadata;
}

export interface CreateQrResult {
  id: string;
  qrString: string;
  qrImage?: string | null;
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

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(new URL(path, PEY_API_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PEY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new PeyError(response.status, data);
  return data as T;
}

export function createQr(input: CreateQrInput): Promise<CreateQrResult> {
  return request('/codi/qr', input);
}

export function createPush(input: CreatePushInput): Promise<CreatePushResult> {
  return request('/codi/pn', input);
}
