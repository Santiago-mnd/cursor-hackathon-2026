<script lang="ts">
  type Method = 'qr' | 'phone';
  type Status = 'waiting' | 'paid' | 'expired' | 'failed';
  type Panel = 'idle' | 'phone' | 'status';

  interface CreatedCharge {
    id: string;
    amount: number;
    method: Method;
    expiresAt: number;
    qrSvg?: string;
    phoneLast4?: string;
  }

  let { mock = false }: { mock?: boolean } = $props();

  let digits = $state('');
  let concept = $state('');
  let phone = $state('');
  let panel = $state<Panel>('idle');
  let charge = $state<CreatedCharge | null>(null);
  let status = $state<Status>('waiting');
  let errorMessage = $state('');
  let busy = $state(false);
  let now = $state(Date.now());

  const amount = $derived(Number(digits || '0'));
  const canCharge = $derived(amount > 0 && !busy);
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const remaining = $derived(charge ? Math.max(0, Math.ceil((charge.expiresAt - now) / 1000)) : 0);
  const countdown = $derived(`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`);

  function press(key: string) {
    if (key === 'back') {
      digits = digits.slice(0, -1);
      return;
    }
    if (key === '.' && (digits.includes('.') || digits === '')) return;
    const [, decimals] = digits.split('.');
    if (decimals !== undefined && decimals.length >= 2) return;
    if (digits.replace('.', '').length >= 7) return;
    if (digits === '0' && key !== '.') digits = key;
    else digits += key;
  }

  async function create(method: Method) {
    if (!canCharge) return;
    busy = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, concept, method, phoneNumber: method === 'phone' ? phone : undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo cobrar');
      charge = data as CreatedCharge;
      status = 'waiting';
      now = Date.now();
      panel = 'status';
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'No se pudo cobrar';
      if (method === 'qr' || panel === 'status') {
        status = 'failed';
        panel = 'status';
      }
    } finally {
      busy = false;
    }
  }

  function askPhone() {
    if (amount <= 0) return;
    errorMessage = '';
    panel = 'phone';
  }

  function reset() {
    digits = '';
    concept = '';
    phone = '';
    charge = null;
    status = 'waiting';
    errorMessage = '';
    panel = 'idle';
  }

  function retry() {
    const method = charge?.method ?? (phone ? 'phone' : 'qr');
    charge = null;
    create(method);
  }

  async function simulatePaid() {
    if (!charge) return;
    await fetch(`/api/charges/${charge.id}/simulate-paid`, { method: 'POST' });
  }

  $effect(() => {
    if (panel !== 'status' || !charge || status !== 'waiting') return;
    const id = charge.id;
    const tick = setInterval(() => (now = Date.now()), 1000);
    const poll = setInterval(async () => {
      try {
        const response = await fetch(`/api/charges/${id}`);
        if (!response.ok) return;
        const data = (await response.json()) as { status: Status };
        if (data.status !== 'waiting') status = data.status;
      } catch {
        /* sin red: se reintenta en el siguiente ciclo */
      }
    }, 2000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  });

  $effect(() => {
    if (status === 'waiting' && charge && remaining === 0) status = 'expired';
  });

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];
</script>

<div class="grid h-full min-h-0 md:grid-cols-2">
  <section
    class="flex min-h-0 flex-col gap-4 px-5 pt-6 pb-4 md:border-r md:border-line md:px-8"
    class:max-md:hidden={panel !== 'idle'}
    aria-label="Monto"
  >
    <p class="text-center text-sm text-ink-soft">¿Cuánto vas a cobrar?</p>
    <p class="num text-center text-[64px] leading-none tracking-tight" aria-live="polite">
      <span class="align-[0.6em] text-[32px]">$</span>{digits || '0'}
    </p>
    <label class="sr-only" for="concept">Concepto (opcional)</label>
    <input
      id="concept"
      bind:value={concept}
      maxlength="60"
      placeholder="Concepto (opcional)"
      class="border-b border-line bg-transparent px-1 py-2.5 text-center text-base placeholder:text-ink-soft focus:border-ink focus:outline-none"
    />
    <div class="mt-auto grid grid-cols-3 gap-1.5">
      {#each keys as key (key)}
        <button
          type="button"
          class="num h-14 rounded-xl text-[26px] active:bg-off"
          aria-label={key === 'back' ? 'Borrar' : key}
          onclick={() => press(key)}
        >
          {key === 'back' ? '⌫' : key}
        </button>
      {/each}
    </div>
    <div class="grid gap-2">
      <button
        type="button"
        class="h-14 rounded-[var(--radius-control)] bg-brand text-lg font-bold text-brand-ink disabled:opacity-40"
        disabled={!canCharge}
        onclick={() => create('qr')}
      >
        {busy ? 'Creando…' : 'Mostrar QR'}
      </button>
      <button
        type="button"
        class="h-14 rounded-[var(--radius-control)] border border-ink text-lg font-bold disabled:opacity-40"
        disabled={!canCharge}
        onclick={askPhone}
      >
        Enviar al celular
      </button>
    </div>
  </section>

  <section
    class="relative flex min-h-0 flex-col overflow-hidden"
    class:max-md:hidden={panel === 'idle'}
    class:bg-paid={panel === 'status' && status === 'paid'}
    class:md:bg-stage={!(panel === 'status' && status === 'paid')}
    aria-live="polite"
  >
    {#if panel === 'idle'}
      <div class="m-auto max-w-xs px-6 text-center text-ink-soft">
        <p class="text-lg">Escribe el monto y elige cómo cobrar.</p>
      </div>
    {:else if panel === 'phone'}
      <form
        class="flex flex-1 flex-col gap-4 px-5 pt-6 pb-4 md:px-8"
        onsubmit={(event) => {
          event.preventDefault();
          create('phone');
        }}
      >
        <button type="button" class="self-start text-sm text-ink-soft" onclick={() => (panel = 'idle')}>← Monto</button>
        <p class="num text-4xl tracking-tight">{money.format(amount)}</p>
        <label for="phone" class="text-lg font-bold">Celular del cliente</label>
        <input
          id="phone"
          bind:value={phone}
          inputmode="numeric"
          autocomplete="tel-national"
          maxlength="10"
          placeholder="55 1234 5678"
          class="num rounded-[var(--radius-control)] border border-line bg-paper px-4 py-4 text-2xl tracking-wider focus:border-ink focus:outline-none"
        />
        <p class="text-sm" class:text-fail-ink={errorMessage} class:text-ink-soft={!errorMessage}>
          {errorMessage || 'Escribe 10 dígitos'}
        </p>
        <button
          type="submit"
          class="mt-auto h-14 rounded-[var(--radius-control)] bg-brand text-lg font-bold text-brand-ink disabled:opacity-40"
          disabled={phone.replace(/\D/g, '').length !== 10 || busy}
        >
          {busy ? 'Enviando…' : 'Envía el cobro'}
        </button>
      </form>
    {:else if status === 'paid' && charge}
      <div class="flex flex-1 flex-col items-center justify-center gap-2 px-5 pt-6 pb-4 text-center">
        <span class="relative grid size-24 place-items-center rounded-full bg-paper [animation:pop_520ms_var(--ease-snap)_both]">
          <span class="absolute inset-0 rounded-full border-[3px] border-paper [animation:ring_1.2s_var(--ease-snap)_infinite]"></span>
          <svg viewBox="0 0 24 24" class="size-12 text-paid-ink" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <p class="mt-4 text-[44px] leading-none font-bold">¡Pagado!</p>
        <p class="num text-[56px] tracking-tight">{money.format(charge.amount)}</p>
        <p class="text-base">Dinero en tu cuenta, sin comisión</p>
        <button
          type="button"
          class="mt-auto h-14 w-full max-w-sm rounded-[var(--radius-control)] bg-ink text-lg font-bold text-paper"
          onclick={reset}
        >
          Nuevo cobro
        </button>
      </div>
    {:else if status === 'expired' || status === 'failed'}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-6 pb-4 text-center">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
          class:bg-off={status === 'expired'}
          class:bg-fail={status === 'failed'}
        >
          {status === 'expired' ? 'Expiró' : 'Falló'}
        </span>
        <p class="text-2xl font-bold">{status === 'expired' ? 'Se venció el cobro' : 'No se pudo cobrar'}</p>
        {#if status === 'failed' && errorMessage}<p class="text-ink-soft">{errorMessage}</p>{/if}
        <div class="mt-auto grid w-full max-w-sm gap-2">
          <button
            type="button"
            class="h-14 rounded-[var(--radius-control)] bg-brand text-lg font-bold text-brand-ink"
            onclick={retry}
          >
            {status === 'expired' ? 'Cobra de nuevo' : 'Intenta de nuevo'}
          </button>
          <button type="button" class="h-12 text-ink-soft" onclick={reset}>Nuevo cobro</button>
        </div>
      </div>
    {:else if charge}
      <div class="flex flex-1 flex-col items-center gap-4 px-5 pt-6 pb-4 text-center">
        <div class="flex w-full items-center justify-between">
          <button type="button" class="text-sm text-ink-soft" onclick={reset}>Cancelar</button>
          <span class="inline-flex items-center gap-2 rounded-full bg-wait px-3 py-1.5 text-[13px] font-medium">
            <span class="size-2.5 rounded-full bg-wait-ink [animation:pulse-dot_1.4s_ease-in-out_infinite]"></span>
            Esperando pago
          </span>
        </div>
        {#if charge.method === 'qr' && charge.qrSvg}
          <div class="mt-2 w-full max-w-[260px] rounded-[var(--radius-card)] border border-line bg-paper p-3">
            {@html charge.qrSvg}
          </div>
          <p class="num text-[44px] tracking-tight">{money.format(charge.amount)}</p>
          <p class="text-ink-soft">Pide que escaneen el QR</p>
        {:else}
          <p class="num mt-10 text-[44px] tracking-tight">{money.format(charge.amount)}</p>
          <p class="text-ink-soft">Cobro enviado al celular •••• {charge.phoneLast4}</p>
        {/if}
        <p class="num text-[15px] text-wait-ink">Vence en {countdown}</p>
        {#if mock}
          <button
            type="button"
            class="mt-auto rounded-[var(--radius-control)] border border-dashed border-ink-soft px-4 py-2.5 text-sm text-ink-soft"
            onclick={simulatePaid}
          >
            Modo de prueba: simular pago
          </button>
        {/if}
      </div>
    {/if}
  </section>
</div>
