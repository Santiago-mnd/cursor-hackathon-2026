# AGENTS.md

Cómo se trabaja en este repo.

## Stack
- Astro 7 en modo servidor con `@astrojs/vercel`, islas de Svelte 5 (runas) y Tailwind v4.
- Firebase Auth con Google (cookie de sesión `deuna_session`, HttpOnly) y Firestore, en plan Spark. Sin Functions por ahora.
- TypeScript estricto y pnpm. Nada de npm ni de JavaScript.

## Capas
- `src/pages`: rutas y endpoints (`api/`). Piden datos y llaman a `lib`.
- `src/layouts`: esqueleto de página con la meta de cada ruta.
- `src/templates`: composición de un tipo de página.
- `src/components`: piezas de UI sin acceso a datos.
- `src/lib`: lógica. `pey.ts` (cliente de la API y consulta de pago), `charges.ts` (crear cobros y tope), `webhook.ts` (firma Standard Webhooks), `session.ts` (sesión), `register.svelte.ts` (catálogo en el navegador), `firebase/admin.ts` (solo servidor) y `firebase/client.ts` (navegador).
- `src/styles/global.css`: los tokens viven en `@theme` y no se repiten.

## Seguridad
- La llave de pey y la cuenta de servicio de Firebase solo existen en el servidor (`astro:env/server`).
- El cliente nunca escribe cobros ni transacciones: lo hace el servidor con el Admin SDK. Las reglas están en `firestore.rules`.
- No se guarda la CLABE completa: solo el `bankAccountId` de pey y los últimos 4 dígitos.

## Variables
Ver `.env.example`. Los secretos van en `.env` (ignorado) y en las variables de entorno de Vercel.

- `PEY_MOCK=true`: modo de prueba con «Simular pago». Sin llave y sin `PEY_MOCK`, crear un cobro responde 503.
- `PEY_CHARGE_CAP`: tope de lo que se manda a pey. En producción vale `0.01` mientras dure la demo, porque la llave va ligada a la CLABE de prueba de pey y lo que se paga ahí no se devuelve. Con tope, Cobrar muestra la ventana «Cobros de prueba» y la línea «Cobro real de esta venta».
- Si cambia el texto de la ventana «Cobros de prueba», se sube la versión de `NOTICE_KEY` en `ChargeFlow.svelte` (hoy `deuna.demo-notice.v2`) para que la vea de nuevo quien ya la cerró.
- `PEY_BANK_ACCOUNT_ID` es opcional: la llave ya va ligada a una cuenta CoDi.
- Para cargar secretos, el owner corre un script con entrada oculta en otro pane: `~/personal/handoffs/2026-11-14-deuna-pey/save-pey-secrets.ts` (llave) y `save-webhook-secret.ts` (secreto del webhook). Nunca se pegan en el chat.

## pey
- Los webhooks llegan planos: `codiQrId` y `transactionId` vienen en el primer nivel, no dentro de `data`.
- El webhook se registra en el portal de pey: Desarrollador → engrane de la llave → «Crear Secreto de Webhook», con `https://deuna.cattion.com/api/webhooks/pey`. Abrir esa URL en el navegador da 404 porque solo acepta POST.
- Respaldo: mientras un cobro espera, `GET /api/charges/[id]` le pregunta a pey si ya se pagó (`/transaction/codi/qr/{IDC}` o `/transaction/{transactionId}`).
- pey sí tiene entorno de pruebas (`https://api.dev.pey.mx`, portal `portal.dev.mipey.mx`), pero la demo se probó en producción con $0.01 y la CLABE pre-autorizada que pey dio en el evento.
- La API no tiene endpoint para listar cuentas: `GET /bank-account/{id}` pide el id que devolvió `POST /bank-account`. La referencia completa está en `https://docs.pey.mx/openapi.json` y `https://docs.pey.mx/llms.txt`.

## Comandos
- `pnpm dev`: servidor local en el puerto 4400. Astro 7 lo deja en segundo plano: se revisa con `pnpm exec astro dev status` y se apaga con `pnpm exec astro dev stop` al terminar.
- `pnpm build` y `pnpm check`.
- `firebase deploy --only firestore:rules`: publica las reglas.

## Despliegue
- Vercel no está conectado a git. Después del merge, y solo con orden del owner: `vercel deploy --prod --yes` desde `main`.
- Para probar producción sin tocar el dominio: `vercel deploy --prod --skip-domain`, más `vercel curl <ruta> --deployment <url> -- <args de curl>`, que salta la protección. Los errores se leen con `vercel logs <url> --json`.
- El login se prueba en producción, no solo en el VPS: el runtime de Vercel no permite `require()` de módulos ESM.
- No se quita el override `jwks-rsa: ^3.2.2` de `pnpm-workspace.yaml`. jwks-rsa 4 carga jose 6 (solo ESM) y en Vercel rompe el login con `ERR_REQUIRE_ESM`. Node va fijo en 24.x, igual que el VPS.

## Decisiones del owner
- 14-nov-2026: ningún texto público nombra a Mercado Pago; se dice «una app de cobro popular».
- 14-nov-2026: la licencia es solo AGPL-3.0, sin MIT.
- 14-nov-2026: en textos públicos se dice «comercio popular», no «comercio informal». Los datos del INEGI sobre informalidad se citan con sus propios términos.
- 15-nov-2026: mientras todos los cobros lleguen a la cuenta de prueba de pey, se avisa en tres lugares: el footer de la landing (demo del hackatón, $0.01 sin devolución, una sola cuenta de prueba, link al código y «Con tecnología de pey»), la ventana «Cobros de prueba» de Cobrar y la sección «Cuenta para cobros» de Cuenta. Cuando cada vendedor registre su CLABE, se cambian los tres juntos.
