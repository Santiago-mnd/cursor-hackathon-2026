<script lang="ts">
  let busy = $state(false);

  async function signOut() {
    busy = true;
    await fetch('/api/session', { method: 'DELETE' }).catch(() => null);
    try {
      const [{ auth }, { signOut: firebaseSignOut }] = await Promise.all([
        import('../lib/firebase/client'),
        import('firebase/auth'),
      ]);
      await firebaseSignOut(auth);
    } catch {
      /* la sesión del servidor ya se cerró */
    }
    location.assign('/');
  }
</script>

<button
  type="button"
  class="h-14 rounded-[var(--radius-control)] border border-ink text-lg font-bold disabled:opacity-60"
  disabled={busy}
  onclick={signOut}
>
  Cerrar sesión
</button>
