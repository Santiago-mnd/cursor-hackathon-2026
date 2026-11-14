<script lang="ts">
  let { next = '/cobrar' }: { next?: string } = $props();

  let busy = $state(false);
  let errorMessage = $state('');

  async function signIn() {
    busy = true;
    errorMessage = '';
    try {
      const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
        import('../lib/firebase/client'),
        import('firebase/auth'),
      ]);
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) throw new Error('session');
      location.assign(next);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        errorMessage = 'No pudimos iniciar sesión. Inténtalo de nuevo.';
      }
      busy = false;
    }
  }
</script>

<div class="grid w-full gap-3">
  <button
    type="button"
    class="inline-flex h-14 items-center justify-center gap-3 rounded-[var(--radius-control)] bg-ink px-6 text-lg font-bold text-paper disabled:opacity-60"
    disabled={busy}
    onclick={signIn}
  >
    <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
      <path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#fff" opacity=".85" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path fill="#fff" opacity=".7" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z" />
      <path fill="#fff" opacity=".55" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" />
    </svg>
    {busy ? 'Entrando…' : 'Entrar con Google'}
  </button>
  {#if errorMessage}<p class="text-center text-sm text-fail-ink" role="alert">{errorMessage}</p>{/if}
</div>
