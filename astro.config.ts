import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://deuna.cattion.com',
  output: 'server',
  adapter: vercel(),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      PEY_API_URL: envField.string({ context: 'server', access: 'public', default: 'https://api.dev.pey.mx' }),
      PEY_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PEY_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      PEY_BANK_ACCOUNT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      PEY_MOCK: envField.boolean({ context: 'server', access: 'secret', default: false }),
      FIREBASE_SERVICE_ACCOUNT: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_FIREBASE_API_KEY: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_FIREBASE_AUTH_DOMAIN: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_FIREBASE_PROJECT_ID: envField.string({ context: 'client', access: 'public', default: 'cursor-hackathon-2026' }),
      PUBLIC_FIREBASE_APP_ID: envField.string({ context: 'client', access: 'public' }),
    },
  },
});
