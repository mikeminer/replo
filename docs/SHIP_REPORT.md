# SHIP REPORT

## Outcome

Replo is implemented and deployed as two independent surfaces:

- Web: `https://replo.it` — Next.js, consuming the API only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono, Smartlead production adapter, event ingress, tenant enforcement, and server-side reply redaction

The campaign builder now starts from the product URL, not an uploaded mailing list. It analyzes the site, derives a search intent, searches the public web, crawls official company/team/contact pages, and presents sourced prospects for review. No third-party email finder is used. Emails visibly published by the company are preselected; pattern-resolved candidates are explicitly risky and opt-in.

## Real deliverability Day 1

The production delivery path is complete in code: Smartlead campaign creation, conservative settings, managed account attachment, 400-lead batching, sequences, start/pause, reply-thread response, webhook registration, reply/bounce/unsubscribe normalization, duplicate suppression, daily/monthly quotas, and automatic provider pause above the bounce threshold. Mock sending is isolated to CI/local mode.

The live provider loop is not yet evidenced because Smartlead has no existing session or credential on this machine. Chrome reached the 14-day signup page, but account creation requires a human CAPTCHA and a user-selected password. Therefore production remains deliberately set to `SEND_PROVIDER=mock` until a valid Smartlead key and mailbox IDs exist; it is not misrepresented as live delivery.

Once the Smartlead CAPTCHA/password gate is cleared in the preserved Chrome tab, the remaining operator sequence is executable without code changes: obtain key, set Vercel secrets, add provider-issued DKIM/tracking records in the already-authenticated Register.it session, enable warmup, register the deployed webhook, and run the one-address owned-inbox live smoke/reply loop.

## Verified gates

- `pnpm lint`: pass
- Test suite: pass — 9 tests across real page analysis/public discovery, sender contract, API redaction, configured-workspace launch, and bounce pause
- `pnpm build`: pass — all packages, API, and production Next.js build
- `pnpm smoke`: pass — research → seed → resolve → launch → Free redaction → mock billing upgrade → full reply
- Finder hostname guard: pass
- Vercel production deployments: READY
- `https://replo.it`: HTTP 200
- `https://api.replo.eu/health`: HTTP 200
- `https://api.replo.eu/v1/openapi.json`: HTTP 200
- Production browser GTM flow: pass — 6 prospects from 7 sources, each with public-source links and confidence state
- Vercel custom-domain verification: pass for both domains
- Authoritative DNS: Vercel records and DMARC confirmed directly on `ns1.register.it`
- Deployed API error scan after final request: clean

## Security and product controls

- API keys are generated with `rk_test_` form and stored only as SHA-256 hashes.
- Production uses one sensitive workspace key shared by the web server and API; the API hashes it before lookup and never exposes it to the browser.
- Free reply identity/body are blanked by the API DTO; Pro receives full stored data.
- Dev reply simulation is gated by both mock provider mode and an explicit development flag; production flag is false.
- Provider webhook uses a shared secret or HMAC, event idempotency, and bounce-rate auto-pause.
- Existing MX/SPF were preserved while DMARC was added; provider DKIM values are deferred rather than invented.
- Transactional mail is separated behind a Resend adapter.

Operational evidence is maintained in [OPS_STATE.md](./OPS_STATE.md). The deliverability procedure used for browser operations is in [DELIVERABILITY_RUNBOOK.md](./DELIVERABILITY_RUNBOOK.md).
