# AGENTS.md

Cómo se trabaja en este repo.

## Stack
- Astro 7 en modo servidor con `@astrojs/vercel`, islas de Svelte 5 (runas) y Tailwind v4.
- Firebase Auth (Google y link por correo) y Firestore, en plan Spark. Sin Functions por ahora.
- TypeScript estricto y pnpm. Nada de npm ni de JavaScript.

## Capas
- `src/pages`: rutas y endpoints (`api/`). Piden datos y llaman a `lib`.
- `src/layouts`: esqueleto de página con la meta de cada ruta.
- `src/templates`: composición de un tipo de página.
- `src/components`: piezas de UI sin acceso a datos.
- `src/lib`: lógica. `pey.ts` (cliente de la API), `webhook.ts` (firma Standard Webhooks), `firebase/admin.ts` (solo servidor) y `firebase/client.ts` (navegador).
- `src/styles/global.css`: los tokens viven en `@theme` y no se repiten.

## Seguridad
- La llave de pey y la cuenta de servicio de Firebase solo existen en el servidor (`astro:env/server`).
- El cliente nunca escribe cobros ni transacciones: lo hace el servidor con el Admin SDK. Las reglas están en `firestore.rules`.
- No se guarda la CLABE completa: solo el `bankAccountId` de pey y los últimos 4 dígitos.

## Variables
Ver `.env.example`. Los secretos van en `.env` (ignorado) y en las variables de entorno de Vercel.

## Comandos
- `pnpm dev`: servidor local en el puerto 4400.
- `pnpm build` y `pnpm check`.
- `firebase deploy --only firestore:rules`: publica las reglas.
