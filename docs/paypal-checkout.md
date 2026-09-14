# PayPal checkout activation

Homepage: no product prices or payment buttons. `/previews` contains sample links and checkout. USD prices: AI Productivity $9.99; Idea Ignition $14.99; Pi NFT Signal $12.99. Pi prices remain 3 / 5 / 10.

PayPal is disabled by default. Add these server-only settings to `.env.mainnet` (never commit credentials):

```dotenv
PAYPAL_ENABLED=false
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MERCHANT_ID=
```

Use a PayPal Developer sandbox REST application and the merchant ID of its sandbox business account. Use a separate sandbox personal account as buyer. `FRONTEND_URL` must be the exact frontend origin. Change `PAYPAL_ENABLED=true` only when the matching sandbox credentials are in place. No credential is sent to the frontend.

Rebuild backend and frontend together using the existing mainnet project and explicit compose files:

```sh
docker compose --env-file .env.mainnet -p pi-mainnet -f docker-compose.yml -f docker-compose.mainnet.yml up -d --build --no-deps backend frontend
```

Before live activation, exercise each kit through approval, return, Confirm payment, download, cancelled checkout, reload, repeat confirmation, interrupted response, and a refund followed by denied download. Compare downloaded ZIPs with the approved publications. Check homepage and signed-in Pi sessions have no PayPal buttons. Test Pi purchases separately. Confirm applicable business tax settings/obligations before live sales; this integration does not calculate taxes.

Switch to a live REST application and its matching live merchant ID only after sandbox verification. Set `PAYPAL_ENV=live`, rebuild, and confirm a controlled real purchase and refund. Local automated tests use mocked PayPal responses and are not evidence of a successful sandbox or live transaction.

## Delivery and recovery

The buyer approves on PayPal, returns, and selects Confirm payment. Capture and delivery are verified on the server. Repeated confirmation uses the same PayPal request ID and queries existing payment state. A completed current capture is required on every download; a refund blocks subsequent downloads. Already downloaded files cannot be revoked.

Purchase access is a random 256-bit capability stored in the buyer's browser; only its hash is stored in MongoDB. The private recovery link carries it in a URL fragment, not in server request logs. Buyers must keep this link private and save it for cross-device recovery. This release does not email recovery links and does not use webhooks. If a buyer closes PayPal without returning, they must reopen the saved purchase and confirm payment. Pending payments require a later check, not a second purchase. Support verifies PayPal references manually for lost access. Keep `paypal_orders` in database backups.

PayPal creation is blocked when a Pi session or Authorization header is present; the frontend also hides it. This display restriction does not establish eligibility for Pi's Pi-only ecosystem listing requirements.

Verification: `npm run build` in backend, then `node --test test/paypal.test.cjs`. Frontend: TypeScript check and Vite production build.
