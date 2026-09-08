# Private contact form setup

Do not deploy until the relay and bot protection are configured and a test message reaches the inbox. Existing public email links are replaced by /contact.

## Services

- Brevo free transactional email account. Authenticate a sending domain using the DNS records supplied by Brevo, verify the sender, and enable transactional sending. Free-plan eligibility and limits are controlled by Brevo.
- Cloudflare Turnstile widget with production hostname timothytechradar.com. Use a separate widget/configuration for testnet if desired. Expected action is contact.

## Server-only environment

Set these in the private .env.mainnet file, never in frontend variables or Git:

```
CONTACT_TO=your-private-receiving-address
CONTACT_FROM=verified-sender@your-domain
BREVO_API_KEY=your-secret-key
TURNSTILE_SITE_KEY=your-public-site-key
TURNSTILE_SECRET_KEY=your-secret-key
CONTACT_RATE_SECRET=independent-long-random-secret
```

CONTACT_FROM must be a plain verified email address, not a display-name string. The configured receiving address is never returned by the contact API. Replies from a personal mailbox may reveal that mailbox to the recipient; use a branded support mailbox if reply-address privacy is required.

The backend calls Brevo over HTTPS (avoids DigitalOcean SMTP port restrictions). The public config endpoint exposes only the Turnstile site key. Missing configuration disables submissions. Keep HTTPS enabled. Never paste keys into chat or screenshots.

## Protections and operating limits

- Strict origin check, 12 KB body cap, email/reason/message validation, text-only messages, no attachments, and fixed server recipient.
- Turnstile tokens validated server-side, with hostname and action checks.
- MongoDB atomic counters: 60 valid-form attempts per hour globally before verification; 100 verified attempts per day globally; 5 verified attempts per email per day. These conservative limits can deny legitimate requests during an attack. They are abuse controls, not a guarantee against spam or denial of service.
- Keyed hashes for counters, TTL cleanup within roughly two days; database backup retention still applies. Neither message bodies nor provider errors are logged by the handler.
- No automatic reply to unverified visitor addresses. Provider acceptance is not proof of final inbox delivery. Check Brevo delivery logs for bounces/failures. Ambiguous timeouts may cause duplicate messages when retried.
- Both Pi Browser compatibility and real inbox delivery must be tested after configuration. Keep the current live contact method until this succeeds.

## Validation

Backend: compile with tsc, then run node --test tests/contact.cjs from backend.
Frontend: type-check and build. On testnet, check Turnstile rendering, successful submission and receipt, Reply-To, invalid inputs, unavailable service and expired challenge retry. Confirm the production frontend bundle has no receiving address or secret.

Deploy both backend and frontend; this change is not frontend-only. Historical public Git commits and cached previous site bundles may still contain the previously published address. This change removes it from the current source and rebuilt site, not the historical record.
