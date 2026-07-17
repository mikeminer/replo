# CODEX MASTER PROMPT — Replo (COMPLETE PRODUCT — REAL DELIVERABILITY DAY 1)

You are an autonomous senior full-stack engineer + email deliverability operator + DevOps agent.  
Build the **entire finished Replo product** in this repository until it is **live-capable with real outbound email**, not a demo with fake sends.

**Do not stop** at scaffolding, mocks-as-product, or “TODO: integrate ESP later”.  
**Do not stop** at “user must configure Smartlead/DNS manually”.  
**You have Google Chrome / browser access — use it to do ALL operator work yourself.**

**Real deliverability is a Day-1 hard requirement** of the shipped product path.  
**You own code + browser ops + verification until the live path works.**

**Repository:** https://github.com/mikeminer/replo  
**Domains:**
- `replo.eu` — sellable **API platform** (third-party platforms)
- `replo.it` — **B2B web product** that consumes `api.replo.eu` like any external client

---

## 0. Non-negotiable product laws

### 0.1 Architecture
1. **Two surfaces, one core**
   - `apps/api` + workers = platform (`api.replo.eu`)
   - `apps/web` = app (`replo.it`)
   - `apps/web` MUST call the API only via HTTP + `@replo/sdk` (or fetch). No importing API domain services into web for GTM/enrich/send.
2. **No third-party email-FINDER waterfall / no finder fallback**
   - Forbidden as email *discovery* sources: Hunter, LeadMagic, Findymail, Exreacher, Apollo email-find, Clearbit, Lusha, RocketReach, etc.
   - Resolution is **Replo-owned**: seed import, page extraction, pattern generation, DNS/MX/catch-all heuristics, confidence scoring.
   - If confidence < threshold → `not_found`. Never call an external finder.
3. **Free vs Pro**
   - Free: limited research/resolve/**real send**; can see **that** replies arrived; **body/identity redacted server-side**.
   - **Pro monthly subscription**: unlock full replies, AI draft respond (via sending provider reply API or mailbox), calendar book, export.
4. **REAL DELIVERABILITY DAY 1 (non-negotiable)**
   - Production product path sends **real emails over the public internet** through a production-grade cold-email infrastructure.
   - **Default production ESP integration (implement fully):** **Smartlead** OR **Instantly** (pick **one primary**, implement completely; optionally stub interface for the other).
   - **Managed sending for Free (and default Pro):** mailboxes / domains controlled by Replo (customer does NOT receive free replies in their personal Gmail — otherwise reply-lock monetization breaks).
   - Required capabilities wired end-to-end:
     - create/sync campaign + leads + sequence steps
     - send real outbound
     - receive **reply webhooks**
     - receive **bounce / failed / unsubscribe** events
     - pause campaign on bounce-rate threshold
     - daily send caps + ramp settings
     - unsubscribe / List-Unsubscribe headers where provider allows
   - SPF / DKIM / DMARC / custom tracking domain: **you configure them via browser** when credentials/domains exist; also document in runbook.
5. **Mocks are for CI only — not the product**
   - Unit/CI may use a `SenderPort` fake when `SEND_PROVIDER=mock`.
   - With `SEND_PROVIDER=smartlead` (or `instantly`) + valid keys, **real API calls** must work.
   - Shipping “only mock sender” = **NOT DONE**.
6. **You do everything (browser-first ops)**
   - Use Chrome/browser tools to: create ESP accounts, generate API keys, configure webhooks, copy DNS records into the DNS host, verify domain status, enable warmup, create mailboxes, send a real test email to an owned inbox, confirm webhook delivery.
   - Read secrets from environment / `.env` / OS keychain / user profile if already present; write results back to `.env.local` (gitignored) and `docs/OPS_STATE.md`.
   - **Never** leave a step as “tell the human to click in Smartlead”.
   - Only hard-stop if a step requires **payment with no card on file** or a secret that literally does not exist anywhere you can access — then record the exact blocker in `docs/BLOCKERS.md` and continue all other work; retry browser path after documenting the minimum missing secret name (not a tutorial dump).
7. **Finish criteria**
   - `pnpm test`, `pnpm build`, `pnpm smoke` pass in mock mode.
   - Full ESP client implemented.
   - Browser ops completed as far as credentials allow; `docs/OPS_STATE.md` shows keys present / webhook URL set / DNS status.
   - `pnpm smoke:live` passes when keys exist (real test to owned email).
   - `docs/DELIVERABILITY_RUNBOOK.md` + `docs/SHIP_REPORT.md` complete.

---

## 1. Definition of DONE (all required)

### A. Platform API
- [ ] Multi-tenant orgs, hashed API keys, rate limits
- [ ] `/v1/*` REST + OpenAPI
- [ ] Async jobs (research, resolve, campaign sync, launch)
- [ ] All endpoints in §5
- [ ] Signed outbound webhooks to API customers
- [ ] Usage metering
- [ ] **Full Smartlead or Instantly client** (not skeleton)
- [ ] Inbound webhook handlers for ESP events (reply/bounce/unsub)
- [ ] Bounce-rate auto-pause
- [ ] Plan-aware reply redaction
- [ ] Tests green

### B. Web app
- [ ] Auth + workspace bootstrap → API key server-side
- [ ] URL → ICP/angles
- [ ] Seed leads → proprietary resolve → message preview
- [ ] **Launch real campaign** to ESP when configured
- [ ] Inbox: free locked / Pro unlocked
- [ ] Pro: draft reply + send reply via provider when possible
- [ ] Meeting book (Google Calendar OAuth **or** generate `ics` + manual link MVP if Google blocked — prefer Google)
- [ ] Stripe Pro monthly (or documented mock only when `BILLING_MOCK=true`)
- [ ] Pre-launch checkbox: free locks reply content
- [ ] Deliverability status page: domain/mailbox health from provider API if available

### C. Deliverability ops
- [ ] `docs/DELIVERABILITY_RUNBOOK.md` (DNS, warmup, ramp, limits, go-live checklist)
- [ ] Env vars for ESP, webhook secrets, mailbox pool IDs
- [ ] Seed does **not** claim fake inbox placement; seed only for UI demo in mock mode
- [ ] `scripts/verify-esp-connection.ts` — pings provider API and prints account/mailboxes

### D. Quality gates
- [ ] CI: lint, test, build (mock send)
- [ ] Enrichment package forbids broker hostnames (test or grep)
- [ ] `docs/PROGRESS.md` + `docs/SHIP_REPORT.md`

---

## 2. Real deliverability architecture

```text
replo.it (web)
    → api.replo.eu
        → packages/enrichment (owned find/verify)
        → packages/sending (SenderPort)
              → Smartlead OR Instantly  [PRODUCTION DEFAULT]
              → mock                     [CI / local without keys]
        → webhook ingress /v1/webhooks/esp/*
              → replies table (full body stored server-side)
              → free clients get redacted DTO
```

### 2.1 Why managed mailboxes
Free users must **not** send from their own Gmail/Outlook for free tier.  
If they did, they would read replies outside Replo and never upgrade.

**Day-1 model:**
- Replo attaches campaigns to a **pool of warmed mailboxes** in Smartlead/Instantly.
- Env configures pool IDs / account emails.
- UI shows “Sending from Replo-managed inboxes (protects your domain)”.

### 2.2 Provider selection (implement ONE fully)

| Priority | Provider | Notes |
|----------|----------|--------|
| **Primary** | **Smartlead** | Campaigns, leads, sequences, webhooks, email account APIs — implement complete adapter |
| Alternative | Instantly V2 API | Acceptable if Smartlead docs/keys harder; still must be **complete** |

Do not implement a half client. Implement:

**Smartlead (preferred) — minimum methods:**
- list/create campaign
- add leads to campaign
- set sequence messages / lines
- start/pause campaign
- get email accounts / attach accounts to campaign
- webhook registration docs + handler for reply + bounce
- fetch message/reply thread if needed for Pro respond
- send reply / reply-all if API supports; else create follow-up message task

Read official API docs during implementation. Handle pagination and errors.

### 2.3 Deliverability controls (product logic)
Constants (tunable via env):

```text
MAX_BOUNCE_RATE = 0.03          # auto-pause campaign
FREE_MAX_SENDS_PER_DAY = 20
FREE_MAX_SENDS_PER_MONTH = 40
PRO_DEFAULT_SENDS_PER_DAY = 50  # still safe ramp; not spam cannon
MIN_EMAIL_CONFIDENCE = 0.78
MAX_NEW_DOMAIN_DAILY_RAMP = [10,15,20,25,30,40,50]  # document in runbook
```

Before launch API must:
1. All leads either `resolved` with email or skipped
2. verification not `invalid`
3. campaign has ≥1 sequence step
4. ESP account/mailbox configured
5. org under send quota for plan
6. persist ESP campaign id on local campaign

### 2.4 DNS / domain go-live (runbook must include)
For each sending domain (ops-owned):
- SPF include provider
- DKIM CNAMEs from provider
- DMARC `p=none` → quarantine path documented
- Custom tracking domain CNAME if provider recommends
- Reverse DNS expectation notes
- Warmup: enable provider warmup on mailboxes; do not send full Pro volume day 1 on cold domain
- Separate **transactional** domain (Resend/Postmark) for product emails (magic link, billing) — **never** mix cold IP/domain with transactional if avoidable

### 2.5 Transactional vs cold
| Type | Tool |
|------|------|
| Cold outbound + reply sync | Smartlead/Instantly |
| App email (auth, invoices) | Resend or Postmark |

Implement thin `TransactionalMailPort` (Resend preferred). Mockable in CI.

---

## 3. Tech stack (fixed)

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces (+ turbo optional) |
| Language | TypeScript strict |
| API | **Hono** on Node (`apps/api`) |
| Workers | Same process job poller **or** separate `apps/worker` — must process jobs reliably |
| Web | Next.js App Router + Tailwind |
| DB | PostgreSQL + Drizzle |
| Queue | Postgres jobs table (+ Redis/BullMQ optional) |
| Auth web | Auth.js |
| Auth API | `rk_live_` / `rk_test_` keys |
| Payments | Stripe subscriptions |
| Validation | Zod |
| Tests | Vitest + supertest; contract tests for SenderPort |
| Cold send | **Smartlead (primary) fully integrated** |
| Tx email | Resend |
| LLM | OpenAI-compatible + mock fallback for CI |
| Scrape | fetch + HTML→text; optional Firecrawl if key set |

---

## 4. Monorepo layout

```text
replo/
  package.json
  pnpm-workspace.yaml
  docker-compose.yml
  .env.example
  .gitignore
  README.md
  AGENTS.md
  CODEX_MASTER_PROMPT.md
  docs/
    ARCHITECTURE.md
    API.md
    PRODUCT.md
    DELIVERABILITY_RUNBOOK.md
    PROGRESS.md
    SHIP_REPORT.md
  packages/
    shared/
    sdk/
    enrichment/          # NO external finders
    sending/             # SenderPort + SmartleadClient + MockSender
    db/
  apps/
    api/
    web/
    worker/              # optional if split from api
  scripts/
    verify-esp-connection.ts
    smoke.ts
    smoke-live.ts
  .github/workflows/ci.yml
```

---

## 5. Data model (Drizzle) — include ESP fields

### Tenancy / billing
`organizations`, `api_keys`, `users`, `memberships`, `subscriptions`, `usage_events`

### GTM
`products`, `icp_profiles`, `angles`, `campaigns`, `leads`, `email_identities`, `resolution_attempts`, `messages`, `sends`, `replies`, `meetings`, `feedback_events`, `jobs`

### Deliverability-specific columns
**campaigns**
- `esp_provider` (`smartlead` | `instantly` | `mock`)
- `esp_campaign_id` text
- `esp_status` text
- `send_cap_daily` int
- `bounce_count` int
- `sent_count` int
- `paused_reason` text nullable

**sends**
- `esp_message_id` text
- `mailbox_id` / `from_email` text
- `status` queued|sent|bounced|failed
- `bounce_type` nullable

**replies**
- full `subject`, `body_text`, `from_email`, `from_name` stored server-side always
- `esp_reply_id`, `thread_id`
- API redacts when org plan is `free`

**esp_mailboxes** (pool)
- `id`, `provider`, `external_account_id`, `email`, `warmup_enabled`, `daily_limit`, `is_active`

**organizations**
- `plan` free|pro
- `stripe_*`
- `monthly_send_count`, `monthly_resolve_count`, period cursor

---

## 6. API surface

### Core (as before, all required)
- `GET /health`
- `GET /v1/openapi.json`
- `POST /v1/internal/bootstrap`
- `GET /v1/me`
- `POST /v1/research/from-url`
- `GET /v1/jobs/:id`
- `POST /v1/emails/find`
- `POST /v1/emails/verify`
- `POST /v1/messages/generate`
- `POST /v1/campaigns`
- `POST /v1/campaigns/:id/leads`
- `POST /v1/campaigns/:id/resolve`
- `POST /v1/campaigns/:id/launch` → **pushes to real ESP when SEND_PROVIDER≠mock**
- `POST /v1/campaigns/:id/pause`
- `GET /v1/campaigns/:id/replies` (redacted if free)
- `GET /v1/replies/:id`
- `POST /v1/replies/:id/draft` (Pro)
- `POST /v1/replies/:id/respond` (Pro → ESP reply API)
- `POST /v1/outcomes`
- `GET /v1/deliverability/status` — mailboxes, caps, recent bounce rate

### ESP webhooks (REAL)
- `POST /v1/webhooks/esp/smartlead` (or unified `/v1/webhooks/esp`)
  - Verify signature/secret if provider supports; else shared secret query/header
  - Map events → replies / bounces / unsubs
  - On bounce: increment counters; pause if over threshold
  - Emit outbound platform webhooks to org callback URL if configured

### Dev-only
- `POST /v1/dev/simulate-reply` **only if** `ALLOW_DEV_ROUTES=true` **and** `SEND_PROVIDER=mock`  
  **Forbidden as the only reply path in production config.**

---

## 7. packages/sending — contract

```ts
interface SenderPort {
  health(): Promise<{ ok: boolean; details: unknown }>;
  listMailboxes(): Promise<Mailbox[]>;
  createCampaign(input: CreateCampaignInput): Promise<{ externalId: string }>;
  upsertLeads(externalCampaignId: string, leads: EspLead[]): Promise<void>;
  setSequence(externalCampaignId: string, steps: SequenceStep[]): Promise<void>;
  startCampaign(externalCampaignId: string): Promise<void>;
  pauseCampaign(externalCampaignId: string): Promise<void>;
  sendReply?(input: ReplyInput): Promise<{ externalId: string }>;
}
```

- `SmartleadSender` — production implementation  
- `MockSender` — CI  
- Factory from `SEND_PROVIDER` env  

**Integration tests:**
- Mock: always in CI  
- Live: `describe.skip` unless `SMARTLEAD_API_KEY` set; `smoke-live` runs them  

---

## 8. packages/enrichment — unchanged law

Proprietary only. Unit tests. No broker domains in source.

---

## 9. Web UX requirements (finished product)

1. Landing + auth  
2. Onboarding URL research  
3. Campaign builder with seed CSV  
4. Resolve results + confidence  
5. Sequence editor (3 steps default)  
6. Pre-launch disclosure checkbox (reply lock on Free)  
7. Launch → shows ESP sync status / external id  
8. Inbox  
   - Free: locked cards + Upgrade CTA  
   - Pro: full thread + Respond + Book meeting  
9. Billing: Stripe Pro monthly  
10. Settings → Deliverability: show mailbox pool health, bounce rate, caps  
11. Clear empty states when `SEND_PROVIDER=mock` (“Running in mock mode — set SMARTLEAD_API_KEY for real sends”)

---

## 10. Monetization

| | Free | Pro monthly |
|--|------|-------------|
| Research URLs | 3/mo | higher/unlimited soft |
| Resolve | 30/mo | plan quota |
| **Real sends** | ≤40/mo, ≤20/day | higher caps |
| See reply count + sentiment | yes | yes |
| Read reply body / from email | **no** | **yes** |
| Respond / book | no | yes |
| Export | no | yes |

Stripe price env `STRIPE_PRICE_PRO_MONTHLY`.  
Webhook sets `organizations.plan=pro`.

---

## 11. Env (`.env.example` must list all)

```bash
DATABASE_URL=postgresql://replo:replo@localhost:5432/replo
API_PORT=4000
API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3000
INTERNAL_SECRET=

# LLM
OPENAI_API_KEY=
LLM_MODE=mock|openai

# Cold email — REAL
SEND_PROVIDER=mock|smartlead|instantly
SMARTLEAD_API_KEY=
SMARTLEAD_WEBHOOK_SECRET=
SMARTLEAD_DEFAULT_EMAIL_ACCOUNT_IDS=   # comma-separated
INSTANTLY_API_KEY=
INSTANTLY_WEBHOOK_SECRET=

# Safety
MAX_BOUNCE_RATE=0.03
FREE_MAX_SENDS_PER_MONTH=40
FREE_MAX_SENDS_PER_DAY=20

# Transactional
RESEND_API_KEY=
EMAIL_FROM_TRANSACTIONAL=noreply@replo.it

# Billing
BILLING_MOCK=true
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

ALLOW_DEV_ROUTES=true
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## 12. Phases (execute fully, real send in phase 3+)

### Phase 0 — Monorepo, DB, compose, CI skeleton
### Phase 1 — `packages/enrichment` + tests
### Phase 2 — API core (research, find, campaigns, redaction, bootstrap)
### Phase 3 — **`packages/sending` Smartlead full client + webhooks + launch path**
### Phase 4 — Web app complete UX + Stripe + inbox lock
### Phase 5 — Runbook, verify-esp script, smoke + smoke-live, SHIP_REPORT

**Phase 3 failure = project not done.** A UI without real ESP is incomplete.

---

## 13. Smoke tests

### `pnpm smoke` (CI, mock)
bootstrap → research → seed → resolve → launch(mock) → simulate reply → assert free redaction → mock upgrade → full reply visible

### `pnpm smoke:live` (requires keys)
- `verify-esp-connection`
- create tiny campaign with **1 safe lead** controlled by operator (env `LIVE_TEST_LEAD_EMAIL` must be an address **you own**)
- start campaign or send test via provider test endpoint if any
- assert external campaign id stored  
**Never spam strangers in automated live smoke.** Document that live smoke uses only `LIVE_TEST_LEAD_EMAIL`.

---

## 14. DELIVERABILITY_RUNBOOK.md (must write) + EXECUTE IT

Write the runbook **and perform every step yourself in Chrome/CLI**. The runbook is the script you follow, not instructions for a human.

Execute:
1. Create/login Smartlead (or Instantly) + API key → `.env.local`  
2. Configure sending domains / mailboxes (dedicated send domain preferred)  
3. Apply DNS (SPF/DKIM/DMARC/tracking) at the DNS host in browser  
4. Enable warmup on 2+ mailboxes  
5. Configure webhook URL (deployed API or your tunnel)  
6. Set env on Vercel/Fly if authenticated  
7. Run `pnpm scripts/verify-esp-connection`  
8. First live test send to owned inbox + reply ingest  
9. Confirm auto-pause config for high bounce  
10. Separate transactional (Resend) vs cold domains  

Log outcomes in `docs/OPS_STATE.md`.

---

## 15. Browser autonomy — YOU DO ALL OPS (Chrome)

You have **Google Chrome / browser automation**. Treat ops as part of the build, not as human homework.

### 15.1 Mandatory browser workflow (execute yourself)

When code reaches Phase 3+, open Chrome and perform:

| # | Task | How |
|---|------|-----|
| 1 | ESP signup/login | Smartlead (preferred) or Instantly — use existing session/cookies if logged in; else use credentials from env `SMARTLEAD_EMAIL` / `SMARTLEAD_PASSWORD` or promptless discovery of `.env` |
| 2 | Create / copy **API key** | Dashboard → API → paste into `.env.local` as `SMARTLEAD_API_KEY` |
| 3 | Create sending domain(s) / mailboxes | In ESP UI + Google Workspace / Microsoft 365 / provider-recommended mailbox host |
| 4 | Copy DNS records | From ESP domain setup UI |
| 5 | Apply DNS | Browser into Cloudflare / Namecheap / registrar DNS for `replo.it` / `replo.eu` / dedicated send domain — add SPF, DKIM, DMARC, tracking CNAME exactly as shown |
| 6 | Wait/verify DNS | Re-check ESP “verified” status; refresh until green or document TTL wait in OPS_STATE with next retry |
| 7 | Enable **warmup** on mailboxes | Toggle in ESP UI |
| 8 | Configure **webhook** URL | Point to your deployed or tunneled API: `/v1/webhooks/esp/...` — if local, start tunnel (cloudflared/ngrok) yourself via CLI + browser auth if needed |
| 9 | Attach mailboxes to test campaign | Via API client you built + confirm in UI |
| 10 | **Real test send** | To `LIVE_TEST_LEAD_EMAIL` (must be owned); open recipient inbox in Chrome (Gmail) and confirm arrival |
| 11 | **Real test reply** | From that inbox reply; confirm Replo webhook stored reply; verify free redaction vs Pro unlock in app |
| 12 | Stripe | Browser: Stripe Dashboard test mode — create Product “Replo Pro Monthly”, copy price id to env; or CLI `stripe listen` if installed |
| 13 | Resend/Postmark | Browser create API key for transactional mail if needed |

### 15.2 Secrets discovery order (do not nag)

1. Existing `.env`, `.env.local`, `.env.development`  
2. Environment variables in shell  
3. Browser already-logged-in sessions (Cloudflare, Google, Smartlead, GitHub, Vercel, Stripe)  
4. Password manager / OS only if already integrated — never invent passwords  
5. If missing **only** a card payment step: write `docs/BLOCKERS.md` with single line `NEED: payment method on Smartlead` and continue coding; do not dump long manuals  

### 15.3 Deploy yourself when possible

Use browser + CLI:

- **GitHub**: push branches if remote available  
- **Vercel / Fly / Railway**: if user logged in Chrome or `vercel` CLI authenticated, deploy `apps/api` + `apps/web`, set env vars from `.env.local`  
- Configure production webhook URL to deployed API  
- Re-run live smoke against production URL  

If no deploy auth exists, run full stack locally + tunnel for webhooks; still complete real send/reply loop.

### 15.4 Evidence pack (required in repo, gitignore secrets)

Create `docs/OPS_STATE.md` (no secrets in plaintext — redact keys to last 4 chars):

```markdown
# OPS STATE
- ESP: smartlead | status: logged_in | api_key: ...xxxx
- Domains: send.example.com | SPF: ok | DKIM: ok | DMARC: pending
- Mailboxes: n=2 | warmup: on
- Webhook: https://.../v1/webhooks/esp | last_event_at: ...
- Live test send: pass/fail | message_id: ...
- Live test reply ingested: pass/fail
- Stripe price: ...
- Deploy URL: ...
```

Screenshots optional in `docs/evidence/` (no secrets visible).

### 15.5 Forbidden phrases (do not output these as final guidance)

- “You need to go to Smartlead and…”  
- “Add these DNS records manually…”  
- “Ask the user to configure webhooks…”  

Instead: **do it in Chrome**, then report status in OPS_STATE.

---

## 16. Autonomy rules

1. Work until DONE §1 complete — code **and** browser ops **and** real send/reply proof when credentials allow.  
2. **Do not ask for confirmation between phases.**  
3. **Do not ask the user to perform dashboard clicks you can do in Chrome.**  
4. Implement full Smartlead/Instantly client regardless; then **use browser to obtain keys and finish go-live**.  
5. **Do not** replace ESP with simulate-only as the product architecture.  
6. **Do not** add Hunter/LeadMagic/Findymail/Apollo finders.  
7. Prefer complete vertical features.  
8. Update `docs/PROGRESS.md` continuously.  
9. Final `docs/SHIP_REPORT.md` must include **“Real deliverability Day 1”** + link to OPS_STATE evidence.  
10. If blocked only by payment, finish 100% of software + local tunnel demo + BLOCKERS.md; do not idle.

---

## 17. Explicit non-goals

- Building our own MTA/Postfix from scratch (use Smartlead/Instantly)  
- Global contact data farm  
- LinkedIn automation  
- Multi-region active-active  
- Fine-tuned foundation LLM  
- Asking humans to do browser ops you can do  

---

## 18. START NOW

1. Scaffold monorepo + DB  
2. Implement enrichment + API + web  
3. Implement **complete** Smartlead/Instantly sender  
4. **Open Chrome** → ESP + DNS + webhooks + warmup + Stripe as available  
5. Real test send + reply loop  
6. Deploy if auth available  
7. `pnpm test` / `build` / `smoke` / `smoke:live`  
8. PROGRESS + OPS_STATE + SHIP_REPORT  

**BEGIN. You write the code, you drive Chrome, you finish the product — including real deliverability.**
