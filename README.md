# Replo

Replo is a multi-tenant outbound platform with owned email resolution and managed cold-email delivery. `apps/api` serves `api.replo.eu`; `apps/web` serves `replo.it` and communicates only through `@replo/sdk` over HTTP.

## Local

```bash
corepack pnpm install
docker compose up -d
copy .env.example .env.local
pnpm test
pnpm build
pnpm smoke
```

Production delivery uses `SEND_PROVIDER=smartlead`. Mock mode exists only for CI and local product development.

## Safety model

- No broker or third-party email finder is used.
- Free replies are redacted in API DTOs, never merely hidden in the browser.
- Launch requires resolved leads, a sequence, managed mailboxes, quota, and reply-lock consent.
- Bounce rate over `MAX_BOUNCE_RATE` pauses the provider campaign.
- Live smoke targets only `LIVE_TEST_LEAD_EMAIL`, an operator-owned inbox.
