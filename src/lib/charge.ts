export type ChargeMethod = 'qr' | 'phone';
export type ChargeStatus = 'waiting' | 'paid' | 'expired' | 'failed';

export interface Charge {
  id: string;
  vendorId: string;
  amount: number;
  concept: string;
  method: ChargeMethod;
  status: ChargeStatus;
  createdAt: number;
  expiresAt: number;
  peyRef: string;
  qrSvg?: string;
  phoneLast4?: string;
  paidAt?: number;
}

export const CHARGE_TTL_SECONDS = 360;

export function effectiveStatus(charge: Charge, now = Date.now()): ChargeStatus {
  if (charge.status === 'waiting' && now > charge.expiresAt) return 'expired';
  return charge.status;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  }).format(timestamp);
}

export function startOfTodayMx(now = Date.now()): number {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(now);
  return new Date(`${day}T00:00:00-06:00`).getTime();
}
