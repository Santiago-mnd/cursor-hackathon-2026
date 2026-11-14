import { FIREBASE_SERVICE_ACCOUNT } from 'astro:env/server';
import type { Firestore } from 'firebase-admin/firestore';
import type { Charge } from './charge';

export interface ChargeStore {
  save(charge: Charge): Promise<void>;
  get(id: string): Promise<Charge | null>;
  findByPeyRef(peyRef: string): Promise<Charge | null>;
  markPaid(id: string, paidAt: number): Promise<void>;
  listSince(since: number): Promise<Charge[]>;
  recordEvent(eventId: string, event: unknown): Promise<boolean>;
}

class FirestoreStore implements ChargeStore {
  constructor(private readonly db: Firestore) {}

  async save(charge: Charge) {
    await this.db.collection('charges').doc(charge.id).set(charge);
  }

  async get(id: string) {
    const snap = await this.db.collection('charges').doc(id).get();
    return snap.exists ? (snap.data() as Charge) : null;
  }

  async findByPeyRef(peyRef: string) {
    const snap = await this.db.collection('charges').where('peyRef', '==', peyRef).limit(1).get();
    return snap.empty ? null : (snap.docs[0]!.data() as Charge);
  }

  async markPaid(id: string, paidAt: number) {
    await this.db.collection('charges').doc(id).update({ status: 'paid', paidAt });
  }

  async listSince(since: number) {
    const snap = await this.db
      .collection('charges')
      .where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return snap.docs.map((doc) => doc.data() as Charge);
  }

  async recordEvent(eventId: string, event: unknown) {
    return this.db
      .collection('webhookEvents')
      .doc(eventId)
      .create({ event, receivedAt: Date.now() })
      .then(() => true)
      .catch(() => false);
  }
}

class MemoryStore implements ChargeStore {
  private charges = new Map<string, Charge>();
  private events = new Set<string>();

  async save(charge: Charge) {
    this.charges.set(charge.id, { ...charge });
  }

  async get(id: string) {
    return this.charges.get(id) ?? null;
  }

  async findByPeyRef(peyRef: string) {
    return [...this.charges.values()].find((charge) => charge.peyRef === peyRef) ?? null;
  }

  async markPaid(id: string, paidAt: number) {
    const charge = this.charges.get(id);
    if (charge) this.charges.set(id, { ...charge, status: 'paid', paidAt });
  }

  async listSince(since: number) {
    return [...this.charges.values()]
      .filter((charge) => charge.createdAt >= since)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async recordEvent(eventId: string) {
    if (this.events.has(eventId)) return false;
    this.events.add(eventId);
    return true;
  }
}

let store: ChargeStore | undefined;

export async function getStore(): Promise<ChargeStore> {
  if (store) return store;
  if (FIREBASE_SERVICE_ACCOUNT) {
    const { db } = await import('./firebase/admin');
    store = new FirestoreStore(db);
  } else {
    store = new MemoryStore();
  }
  return store;
}

export const usingMemoryStore = !FIREBASE_SERVICE_ACCOUNT;
