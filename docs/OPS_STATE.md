# OPS STATE

Updated: 2026-07-17 15:02 Europe/Rome

- ESP: `smartlead` | code: complete | account: signup page reached | api_key: unavailable; account creation awaits human CAPTCHA and a user-chosen password
- Production send mode: `mock` temporarily, because enabling `smartlead` without an account key would fail closed at startup
- Domains: `replo.it` and `api.replo.eu` | Vercel ownership: verified | authoritative DNS: Register.it
- `replo.it`: A `216.198.79.1`, `64.29.17.1` | HTTPS/app: pass
- `api.replo.eu`: CNAME `bf8f76e126d04e22.vercel-dns-017.com` | `/health`: pass | OpenAPI: pass
- Mail DNS preserved: Register.it MX and SPF remain intact on both apex domains
- DMARC: `_dmarc.replo.it` and `_dmarc.replo.eu` published with `p=none`, strict SPF/DKIM alignment, aggregate reports to `dmarc@replo.eu`
- DKIM/tracking: pending provider-issued records; values were not fabricated
- Mailboxes: none in Smartlead yet | warmup: pending account activation
- Webhook implementation: complete at `https://api.replo.eu/v1/webhooks/esp/smartlead` | Smartlead registration pending account activation
- Live test inbox: operator-owned Gmail identified | send/reply: pending Smartlead account activation
- Stripe: Google login reached hCaptcha | price: pending CAPTCHA/account access
- Transactional: Resend adapter complete | key/domain: unavailable in environment/browser session
- Deploy: web `https://replo.it` | API `https://api.replo.eu`
- Autonomous GTM: live at `/app/campaigns/new`; site analysis → Bing public-web discovery → official company/team/contact crawl → sourced prospect review. No mailing-list upload is requested.
- Discovery verification: Chrome production run returned 6 reviewable prospects from 7 public sources. Page-published emails are selected by default; generated owned-domain patterns are marked risky and left unselected.
- Discovery transport: browser uses `@replo/sdk` over a same-origin Vercel edge rewrite to `api.replo.eu`; GET is used because discovery inputs are non-sensitive and the prior Vercel POST body stream stalled before routing.
- Vercel production environment: URLs set; dev routes disabled; internal bootstrap secret and deterministic workspace API key stored as sensitive variables on both projects

No plaintext secrets are recorded in this file. No `BLOCKERS.md` exists because no payment-method failure has occurred; the current unavoidable provider gates are human CAPTCHA/password selection.
