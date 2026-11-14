<script lang="ts">
  import { newId, parseMoney, type Register } from '../lib/register.svelte';

  interface DraftRow {
    id: string;
    name: string;
    amount: string;
  }

  let { register, editing = $bindable(false) }: { register: Register; editing?: boolean } = $props();

  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const signed = (value: number) => `${value < 0 ? '−' : '+'}${money.format(Math.abs(value))}`;

  let draftProducts = $state<DraftRow[]>([]);
  let draftExtras = $state<DraftRow[]>([]);
  let draftError = $state('');

  let customOpen = $state(false);
  let customSign = $state<1 | -1>(1);
  let customAmount = $state('');
  let customNote = $state('');

  const emptyRow = (): DraftRow => ({ id: newId(), name: '', amount: '' });

  function startEditing() {
    draftProducts = register.products.map((product) => ({ id: product.id, name: product.name, amount: String(product.price) }));
    draftExtras = register.extras.map((extra) => ({ id: extra.id, name: extra.name, amount: String(extra.amount) }));
    if (draftProducts.length === 0) draftProducts = [emptyRow()];
    draftError = '';
    editing = true;
  }

  function collect(rows: DraftRow[]): { id: string; name: string; value: number }[] | null {
    const result: { id: string; name: string; value: number }[] = [];
    for (const row of rows) {
      const name = row.name.trim();
      if (!name && !row.amount.trim()) continue;
      const value = parseMoney(row.amount);
      if (!name || value === null) return null;
      result.push({ id: row.id, name, value });
    }
    return result;
  }

  function saveCatalog(event: SubmitEvent) {
    event.preventDefault();
    const products = collect(draftProducts);
    const extras = collect(draftExtras);
    if (!products || !extras) {
      draftError = 'Escribe un nombre y un precio válido';
      return;
    }
    register.setCatalog(
      products.map(({ id, name, value }) => ({ id, name, price: value })),
      extras.map(({ id, name, value }) => ({ id, name, amount: value })),
    );
    editing = false;
  }

  function addCustom(event: SubmitEvent) {
    event.preventDefault();
    const value = parseMoney(customAmount);
    if (value === null) return;
    register.addExtra(customNote, customSign * value);
    customAmount = '';
    customNote = '';
    customSign = 1;
    customOpen = false;
  }

  const field =
    'min-w-0 rounded-[var(--radius-control)] border border-line bg-paper px-3 py-3 text-base focus:border-ink focus:outline-none';
</script>

{#if editing}
  <form class="flex min-h-0 flex-1 flex-col gap-3" onsubmit={saveCatalog}>
    <div class="grid min-h-0 flex-1 content-start gap-5 overflow-auto pb-2">
      <h2 class="text-xl font-bold">Editar productos y extras</h2>
      <section class="grid gap-2" aria-labelledby="edit-products">
        <h3 id="edit-products" class="text-base font-bold">Productos</h3>
        {#each draftProducts as row (row.id)}
          <div class="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
            <input bind:value={row.name} maxlength="30" placeholder="Nombre del producto" aria-label="Nombre del producto" class={field} />
            <div class="relative">
              <span class="num pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">$</span>
              <input bind:value={row.amount} inputmode="decimal" placeholder="Precio" aria-label="Precio" class="{field} num w-full pl-6" />
            </div>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-full text-ink-soft"
              aria-label="Borrar este renglón"
              onclick={() => (draftProducts = draftProducts.filter((item) => item.id !== row.id))}
            >
              ✕
            </button>
          </div>
        {/each}
        <button type="button" class="justify-self-start py-2 text-base font-bold" onclick={() => (draftProducts = [...draftProducts, emptyRow()])}>
          + Agregar producto
        </button>
      </section>

      <section class="grid gap-2" aria-labelledby="edit-extras">
        <h3 id="edit-extras" class="text-base font-bold">Extras guardados</h3>
        {#each draftExtras as row (row.id)}
          <div class="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
            <input bind:value={row.name} maxlength="30" placeholder="Nombre del extra" aria-label="Nombre del extra" class={field} />
            <div class="relative">
              <span class="num pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">$</span>
              <input bind:value={row.amount} inputmode="decimal" placeholder="Precio" aria-label="Precio del extra" class="{field} num w-full pl-6" />
            </div>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-full text-ink-soft"
              aria-label="Borrar este renglón"
              onclick={() => (draftExtras = draftExtras.filter((item) => item.id !== row.id))}
            >
              ✕
            </button>
          </div>
        {/each}
        <button type="button" class="justify-self-start py-2 text-base font-bold" onclick={() => (draftExtras = [...draftExtras, emptyRow()])}>
          + Agregar extra
        </button>
      </section>
    </div>
    {#if draftError}<p class="text-sm text-fail-ink" role="alert">{draftError}</p>{/if}
    <button type="submit" class="h-14 rounded-[var(--radius-control)] bg-ink text-lg font-bold text-paper">Guardar y salir</button>
  </form>
{:else}
  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
    {#if register.loaded && register.products.length === 0}
      <div class="m-auto grid max-w-xs justify-items-center gap-3 py-6 text-center">
        <p class="text-xl font-bold">Aún no tienes productos</p>
        <p class="text-ink-soft">Agrega uno para empezar a cobrar con tu lista.</p>
        <button type="button" class="mt-2 h-12 rounded-[var(--radius-control)] bg-ink px-5 font-bold text-paper" onclick={startEditing}>
          Agregar producto
        </button>
      </div>
    {:else if register.loaded}
      <ul class="divide-y divide-line">
        {#each register.products as product (product.id)}
          {@const qty = register.quantities[product.id] ?? 0}
          <li class="flex items-center gap-2 py-1.5">
            <button type="button" class="min-w-0 flex-1 py-1.5 text-left" onclick={() => register.add(product.id)}>
              <span class="block truncate text-lg leading-tight font-medium">{product.name}</span>
              <span class="num text-sm text-ink-soft">{money.format(product.price)}</span>
            </button>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-full border border-line text-2xl leading-none disabled:opacity-30"
              aria-label="Quitar un {product.name}"
              disabled={qty === 0}
              onclick={() => register.remove(product.id)}
            >
              –
            </button>
            <span class="num w-8 text-center text-xl" class:text-ink-soft={qty === 0} aria-live="polite">{qty}</span>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-full bg-ink text-2xl leading-none text-paper"
              aria-label="Agregar un {product.name}"
              onclick={() => register.add(product.id)}
            >
              +
            </button>
          </li>
        {/each}
      </ul>

      <section class="grid gap-2" aria-labelledby="sale-extras">
        <h2 id="sale-extras" class="text-sm text-ink-soft">Extras</h2>
        <div class="flex flex-wrap gap-2">
          {#each register.extras as extra (extra.id)}
            <button
              type="button"
              class="rounded-full border border-line px-3.5 py-2 text-sm font-medium active:bg-off"
              onclick={() => register.addExtra(extra.name, extra.amount)}
            >
              + {extra.name} <span class="num text-ink-soft">{money.format(extra.amount)}</span>
            </button>
          {/each}
          <button
            type="button"
            class="rounded-full border border-dashed border-ink-soft px-3.5 py-2 text-sm font-medium"
            aria-expanded={customOpen}
            onclick={() => (customOpen = !customOpen)}
          >
            Agregar monto libre
          </button>
        </div>

        {#if customOpen}
          <form class="grid gap-2 rounded-[var(--radius-card)] bg-stage p-3" onsubmit={addCustom}>
            <div class="grid grid-cols-2 rounded-xl bg-off p-1 text-sm font-medium" role="group" aria-label="Tipo de monto">
              <button type="button" class="rounded-lg py-2" class:bg-paper={customSign === 1} aria-pressed={customSign === 1} onclick={() => (customSign = 1)}>
                Sumar
              </button>
              <button type="button" class="rounded-lg py-2" class:bg-paper={customSign === -1} aria-pressed={customSign === -1} onclick={() => (customSign = -1)}>
                Restar
              </button>
            </div>
            <div class="grid grid-cols-[6.5rem_1fr] gap-2">
              <div class="relative">
                <span class="num pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">$</span>
                <input bind:value={customAmount} inputmode="decimal" placeholder="0" aria-label="Monto" class="{field} num w-full pl-6" />
              </div>
              <input bind:value={customNote} maxlength="30" placeholder="Nota (opcional)" aria-label="Nota (opcional)" class={field} />
            </div>
            <button type="submit" class="h-11 rounded-[var(--radius-control)] bg-ink font-bold text-paper disabled:opacity-40" disabled={parseMoney(customAmount) === null}>
              Agregar
            </button>
          </form>
        {/if}

        {#each register.extraLines as line (line.id)}
          <div class="flex items-center gap-2 text-base">
            <span class="min-w-0 flex-1 truncate">{line.name || 'Monto libre'}</span>
            <span class="num" class:text-paid-ink={line.amount < 0}>{signed(line.amount)}</span>
            <button type="button" class="grid size-9 place-items-center text-ink-soft" aria-label="Borrar este renglón" onclick={() => register.removeExtra(line.id)}>
              ✕
            </button>
          </div>
        {/each}
      </section>

      <div class="mt-auto flex items-center justify-between text-sm text-ink-soft">
        <button type="button" class="py-2 underline underline-offset-4" onclick={startEditing}>Editar productos y extras</button>
        {#if register.itemCount > 0}
          <button type="button" class="py-2" onclick={() => register.clearSale()}>Vaciar venta</button>
        {/if}
      </div>
    {/if}
  </div>
{/if}
