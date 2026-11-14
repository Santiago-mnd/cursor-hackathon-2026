export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface ExtraPreset {
  id: string;
  name: string;
  amount: number;
}

export interface ExtraLine {
  id: string;
  name: string;
  amount: number;
}

export type ChargeMode = 'products' | 'amount';

interface StoredCatalog {
  products: Product[];
  extras: ExtraPreset[];
  mode: ChargeMode;
}

const STORAGE_KEY = 'deuna.catalog.v1';
const CONCEPT_MAX_LENGTH = 60;

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function parseMoney(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || value > 100_000) return null;
  return toCents(value) / 100;
}

function isEntryList<T>(value: unknown, numberKey: 'price' | 'amount'): value is T[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;
      const entry = item as Record<string, unknown>;
      return typeof entry['id'] === 'string' && typeof entry['name'] === 'string' && typeof entry[numberKey] === 'number';
    })
  );
}

export class Register {
  products = $state<Product[]>([]);
  extras = $state<ExtraPreset[]>([]);
  mode = $state<ChargeMode>('products');
  quantities = $state<Record<string, number>>({});
  extraLines = $state<ExtraLine[]>([]);
  loaded = $state(false);

  totalCents = $derived(
    this.products.reduce((sum, product) => sum + toCents(product.price) * (this.quantities[product.id] ?? 0), 0) +
      this.extraLines.reduce((sum, line) => sum + toCents(line.amount), 0),
  );

  total = $derived(this.totalCents / 100);

  itemCount = $derived(Object.values(this.quantities).reduce((sum, qty) => sum + qty, 0) + this.extraLines.length);

  summary = $derived(
    [
      ...this.products
        .filter((product) => (this.quantities[product.id] ?? 0) > 0)
        .map((product) => `${this.quantities[product.id]} ${product.name}`),
      ...this.extraLines.filter((line) => line.name).map((line) => line.name),
    ]
      .join(', ')
      .slice(0, CONCEPT_MAX_LENGTH),
  );

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Partial<StoredCatalog>;
        if (isEntryList<Product>(data.products, 'price')) this.products = data.products;
        if (isEntryList<ExtraPreset>(data.extras, 'amount')) this.extras = data.extras;
        if (data.mode === 'products' || data.mode === 'amount') this.mode = data.mode;
      }
    } catch {
      this.products = [];
      this.extras = [];
    }
    this.loaded = true;
  }

  private persist() {
    try {
      const data: StoredCatalog = { products: this.products, extras: this.extras, mode: this.mode };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* sin almacenamiento: el catálogo vive solo en esta sesión */
    }
  }

  setMode(mode: ChargeMode) {
    this.mode = mode;
    this.persist();
  }

  setCatalog(products: Product[], extras: ExtraPreset[]) {
    this.products = products;
    this.extras = extras;
    const ids = new Set(products.map((product) => product.id));
    this.quantities = Object.fromEntries(Object.entries(this.quantities).filter(([id]) => ids.has(id)));
    this.persist();
  }

  add(productId: string) {
    this.quantities = { ...this.quantities, [productId]: (this.quantities[productId] ?? 0) + 1 };
  }

  remove(productId: string) {
    const next = (this.quantities[productId] ?? 0) - 1;
    const { [productId]: _, ...rest } = this.quantities;
    this.quantities = next > 0 ? { ...rest, [productId]: next } : rest;
  }

  addExtra(name: string, amount: number) {
    this.extraLines = [...this.extraLines, { id: newId(), name: name.trim(), amount }];
  }

  removeExtra(lineId: string) {
    this.extraLines = this.extraLines.filter((line) => line.id !== lineId);
  }

  clearSale() {
    this.quantities = {};
    this.extraLines = [];
  }
}
