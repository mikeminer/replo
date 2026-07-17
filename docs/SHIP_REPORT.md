# SHIP REPORT

## Outcome

Replo is implemented and deployed as two independent surfaces:

- Web: `https://replo.it` — Next.js, consuming the API only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono, Smartlead production adapter, event ingress, tenant enforcement, and server-side reply redaction

## Real deliverability Day 1

The production delivery path is complete in code: Smartlead campaign creation, conservative settings, managed account attachment, 400-lead batching, sequences, start/pause, reply-thread response, webhook registration, reply/bounce/unsubscribe normalization, duplicate suppression, daily/monthly quotas, and automatic provider pause above the bounce threshold. Mock sending is isolated to CI/local mode.

The live provider loop is not yet evidenced because Smartlead has no existing session or credential on this machine. Chrome reached the 14-day signup page, but account creation requires a human CAPTCHA and a user-selected password. Therefore production remains deliberately set to `SEND_PROVIDER=mock` until a valid Smartlead key and mailbox IDs exist; it is not misrepresented as live delivery.

Once the Smartlead CAPTCHA/password gate is cleared in the preserved Chrome tab, the remaining operator sequence is executable without code changes: obtain key, set Vercel secrets, add provider-issued DKIM/tracking records in the already-authenticated Register.it session, enable warmup, register the deployed webhook, and run the one-address owned-inbox live smoke/reply loop.

## Verified gates

- `pnpm lint`: pass
- `pnpm test`: pass — 7 tests across enrichment, sender contract, API redaction, and bounce pause
- `pnpm build`: pass — all packages, API, and production Next.js build
- `pnpm smoke`: pass — research → seed → resolve → launch → Free redaction → mock billing upgrade → full reply
- Finder hostname guard: pass
- Vercel production deployments: READY
- `https://replo.it`: HTTP 200
- `https://api.replo.eu/health`: HTTP 200
- `https://api.replo.eu/v1/openapi.json`: HTTP 200
- Vercel custom-domain verification: pass for both domains
- Authoritative DNS: Vercel records and DMARC confirmed directly on `ns1.register.it`
- Deployed API error scan after final request: clean

## Security and product controls

- API keys are generated with `rk_test_` form and stored only as SHA-256 hashes.
- Free reply identity/body are blanked by the API DTO; Pro receives full stored data.
- Dev reply simulation is gated by both mock provider mode and an explicit development flag; production flag is false.
- Provider webhook uses a shared secret or HMAC, event idempotency, and bounce-rate auto-pause.
- Existing MX/SPF were preserved while DMARC was added; provider DKIM values are deferred rather than invented.
- Transactional mail is separated behind a Resend adapter.

Operational evidence is maintained in [OPS_STATE.md](./OPS_STATE.md). The deliverability procedure used for browser operations is in [DELIVERABILITY_RUNBOOK.md](./DELIVERABILITY_RUNBOOK.md).
