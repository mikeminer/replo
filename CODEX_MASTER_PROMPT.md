# CODEX MASTER PROMPT — Replo (build to production-ready MVP)

You are an autonomous senior full-stack engineer. Your job is to build the **entire Replo MVP** in this repository until it is **implemented, wired, and tested**. Do not stop at scaffolding. Do not wait for confirmation between phases unless blocked by missing secrets (then use mocks + `.env.example` and continue).

**Repository:** https://github.com/mikeminer/replo (this workspace)  
**Domains (product intent):**
- `replo.eu` — sellable **API platform** for third parties
- `replo.it` — **B2B web app** that consumes `replo.eu` APIs like any external client

---

## 0. Non-negotiable product laws

1. **Two surfaces, one core**
   - `apps/api` + workers = platform (`api.replo.eu` conceptually)
   - `apps/web` = consumer app (`replo.it` conceptually)
   - `apps/web` MUST call the API via HTTP + API keys (or internal service token), **not** by importing API DB models/business logic directly.
2. **No third-party email-finder waterfall / no fallback**
   - Forbidden as email sources: Hunter, LeadMagic, Findymail, Exreacher, Apollo email find, Clearbit, Lusha, etc.
   - Email resolution is **Replo-owned only**: seed import, page extraction, pattern generation, DNS/MX/catch-all heuristics, confidence scoring.
   - If confidence < threshold → `not_found`. Never silently call an external finder.
3. **Free vs Pro monetization**
   - Free users may run limited research/send and **see that replies exist**.
   - Reply **content is redacted server-side** for free users (not CSS-only blur).
   - **Monthly Pro subscription** unlocks full reply bodies, respond, book meeting, export.
4. **Ship working software**
   - `pnpm install`, `pnpm db:migrate`, `pnpm test`, `pnpm build` must pass.
   - Include Docker Compose for Postgres (+ Redis optional).
   - Mock mode when external keys missing so tests and local demo work offline.

---

## 1. End-state definition of “DONE”

The project is done only when ALL of the following are true:

### Platform API (`apps/api`)
- [ ] Multi-tenant orgs, API keys (hashed), rate limits basic
- [ ] Versioned REST under `/v1/...`
- [ ] Async jobs with status polling
- [ ] Endpoints implemented (see §4)
- [ ] Webhooks outbound (signed) for key events
- [ ] Usage metering records
- [ ] OpenAPI spec generated/served
- [ ] Unit + integration tests for core routes
- [ ] README for developers

### Web app (`apps/web`)
- [ ] Auth (email magic link or credentials dev mode)
- [ ] Onboarding: paste URL → research result
- [ ] Campaign flow: seed leads → resolve emails → preview messages → launch (limited free)
- [ ] Inbox: free sees locked/obscured replies; Pro sees full + reply/book
- [ ] Stripe subscription checkout (Pro monthly) + webhook
- [ ] Billing state drives unlock
- [ ] E2E or integration tests for critical path
- [ ] README for running the app

### Shared
- [ ] Monorepo builds
- [ ] `.env.example` complete
- [ ] `docker-compose.yml` for Postgres
- [ ] CI workflow (GitHub Actions): install, lint, test, build
- [ ] Seed script for demo org + demo data
- [ ] Architecture doc short (`docs/ARCHITECTURE.md`)

**Do not mark done until tests pass.**

---

## 2. Tech stack (fixed — do not bikeshed)

| Layer | Choice |
|-------|--------|
| Monorepo | `pnpm` workspaces + Turborepo (or simple pnpm workspaces) |
| Language | TypeScript strict |
| API | Next.js App Router **or** Hono on Node — prefer **Hono + Node** in `apps/api` for clean API SaaS; if you choose Next for API, keep route handlers thin |
| Web | Next.js 15 App Router + React + Tailwind |
| DB | PostgreSQL + Drizzle ORM |
| Queue/jobs | In-process job runner with Postgres-backed jobs table **for MVP** (plus optional BullMQ if Redis present). Must support async `research`, `resolve_email`, `send_sim` |
| Auth web | NextAuth/Auth.js (credentials + magic link optional) |
| Auth API | API keys `rk_live_...` / `rk_test_...` |
| Payments | Stripe Checkout + Customer Portal + webhooks |
| Validation | Zod |
| Tests | Vitest + Supertest (API); Playwright smoke optional |
| Package manager | pnpm |

**LLM:** abstract `LlmProvider` interface. Default: OpenAI-compatible HTTP if `OPENAI_API_KEY` set; else **deterministic mock LLM** that returns structured JSON fixtures.

**Scraping:** abstract `PageFetcher`. Default: native `fetch` + readability-like HTML→text; if fails, mock. No paid Firecrawl required for MVP.

**Email send (MVP):** **Simulated sender** + optional SMTP later. Free/Pro reply flow uses **simulated inbound replies** in demo/seed and a `POST /v1/dev/simulate-reply` (protected) for tests. Document that production would plug Smartlead/etc. behind `SenderPort` — but do **not** depend on it for green tests.

**Email find:** 100% proprietary module `packages/enrichment`.

---

## 3. Monorepo layout (create exactly)

```text
replo/
  package.json
  pnpm-workspace.yaml
  turbo.json                 # optional
  docker-compose.yml
  .env.example
  .gitignore
  README.md
  AGENTS.md                  # short pointer to this file
  docs/
    ARCHITECTURE.md
    API.md
    PRODUCT.md
  packages/
    shared/                  # zod schemas, types, constants
    sdk/                     # @replo/sdk TypeScript client used by web AND external devs
    enrichment/              # proprietary email resolution (NO external finders)
    db/                      # drizzle schema + migrations + client
  apps/
    api/                     # replo.eu API platform
    web/                     # replo.it B2B app
  .github/workflows/ci.yml
```

---

## 4. Domain model (Postgres)

Implement with Drizzle. Minimum tables:

### Platform tenancy
- `organizations` (id, name, slug, plan_tier default free, stripe_customer_id null)
- `api_keys` (id, org_id, name, key_prefix, key_hash, env test|live, created_at, revoked_at)
- `users` (for web; can live in web auth tables + link `org_id`)
- `memberships` (user_id, org_id, role)

### Billing
- `subscriptions` (org_id, stripe_subscription_id, status, price_id, current_period_end)
- `usage_events` (org_id, meter, units, metadata jsonb, created_at)
- `credit_ledger` optional for metered extras

### Product / GTM
- `products` (org_id, url, title, raw_text, summary jsonb)
- `icp_profiles` (product_id, data jsonb, fit_score)
- `angles` (product_id, name, pitch jsonb)
- `campaigns` (org_id, product_id, status draft|running|paused|completed, hypothesis jsonb, free_send_cap)
- `leads` (campaign_id, full_name, company, domain, title, source, status)
- `email_identities` (lead_id, email nullable, confidence, verification_status, sources jsonb, attribution `replo_owned`)
- `provider_attempts` **rename to** `resolution_attempts` (lead_id, method pattern|extract|seed|mx, success, detail jsonb) — never third-party finder names
- `messages` (lead_id, step, subject, body, status draft|sent|failed)
- `sends` (message_id, provider `simulated`, external_id, sent_at)
- `replies` (id, org_id, campaign_id, lead_id, received_at, sentiment, subject, body_text, from_name, from_email, raw jsonb)
- `meetings` (org_id, lead_id, starts_at, calendar_ref nullable)
- `outcomes` / `feedback_events` (hypothesis linkage, fit, angle_ok, notes)
- `jobs` (id, org_id, type, status queued|running|succeeded|failed, input jsonb, output jsonb, error text, created_at, finished_at)

**Critical:** when serializing replies to free orgs, **strip** subject/body/from_email/from_name full values; return masked fields + `is_locked: true`.

---

## 5. API surface (`apps/api`) — implement all

Base URL: `/v1`

### Auth
- All routes require `Authorization: Bearer rk_...` except health and Stripe webhook (if on API) and OpenAPI.
- Resolve key → org; attach to context.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | ok |
| GET | `/v1/openapi.json` | OpenAPI |
| POST | `/v1/research/from-url` | body `{url}` → job or sync research (prefer async job) |
| GET | `/v1/jobs/:id` | job status/result |
| POST | `/v1/icp/suggest` | from product_id or research payload |
| POST | `/v1/angles/generate` | from product |
| POST | `/v1/emails/find` | proprietary resolve `{full_name, domain, company_name?, page_urls?}` |
| POST | `/v1/emails/verify` | verify candidate email |
| POST | `/v1/messages/generate` | personalized outreach from angle + lead |
| POST | `/v1/campaigns` | create |
| GET | `/v1/campaigns/:id` | get |
| POST | `/v1/campaigns/:id/leads` | bulk upsert leads (seed) |
| POST | `/v1/campaigns/:id/resolve` | enqueue resolve all leads |
| POST | `/v1/campaigns/:id/launch` | mark running + create sends (simulated); enforce free caps |
| GET | `/v1/campaigns/:id/replies` | **plan-aware redaction** |
| GET | `/v1/replies/:id` | single reply plan-aware |
| POST | `/v1/replies/:id/draft` | Pro only |
| POST | `/v1/outcomes` | feedback |
| POST | `/v1/dev/simulate-reply` | test/dev only if `ALLOW_DEV_ROUTES=true` |
| GET | `/v1/me` | org + plan status |

### Web app BFF auth bridge
Also implement internal route used by web after user login:
- Web creates/uses one org per user workspace and stores API key server-side (encrypted or in DB only server-side).
- Or: web exchanges session for org API key via `POST /v1/internal/bootstrap` protected by `INTERNAL_SECRET`.

Implement **bootstrap**:
- `POST /v1/internal/bootstrap` header `x-internal-secret`
- body `{ workspace_name, external_user_id, email }`
- returns `{ org_id, api_key }` once (store hash; return plaintext only once)

### Plan gates
- `organizations.plan` ∈ `free` | `pro`
- Stripe webhook sets `pro` when `customer.subscription.updated` active
- Free limits (constants in shared):
  - `FREE_MAX_URL_RESEARCH = 3` / month
  - `FREE_MAX_RESOLVE = 30` / month
  - `FREE_MAX_SENDS = 40` / month
  - Replies always listed but locked if free

---

## 6. Proprietary enrichment (`packages/enrichment`)

Implement pure functions + services:

1. **normalizeDomain(companyOrUrl)**
2. **extractEmailsFromText(text)** — mailto and regex
3. **extractPeopleFromTeamHtml(html/text)** — heuristic names/titles (LLM optional enhance)
4. **generateEmailPatterns(first, last, domain)** — common patterns:
   - first.last@, f.last@, first@, firstlast@, first_l@, etc.
5. **mxLookup(domain)** — use Node dns promises
6. **assessCatchAll(domain)** — heuristic (optional light SMTP skip if unreliable in CI; mockable)
7. **scoreCandidate(...)** → 0..1 confidence
8. **resolveEmail(input)** → `{ email, confidence, verification_status, sources } | not_found`

**Policy:** only return email if `confidence >= 0.78` and verification not `invalid`.

**Tests:** unit tests with fixtures (sample team page HTML, known patterns).

**FORBIDDEN:** HTTP calls to hunter.io, leadmagic, findymail, apollo, etc. Add a CI grep check or unit test that source code of enrichment does not contain those hostnames.

---

## 7. Web UX (`apps/web`) — screens to build

### Marketing `/`
- Explain Replo.it powered by Replo API
- CTA Sign up

### Auth
- Sign in / sign up (dev credentials: `demo@replo.it` / `demo1234` seeded)

### `/onboarding` or `/app`
1. Paste product URL → call API research → show ICP + angles
2. Create campaign
3. Seed leads: textarea “Name, Company, Domain” CSV-ish paste (min 3 rows example)
4. Resolve emails → table with confidence / not_found
5. Generate messages preview
6. Checkbox required before launch free:
   - “I understand free plan locks reply content until Pro”
7. Launch campaign
8. Button “Simulate inbound replies” (dev) for demo
9. **Inbox**
   - Free: cards with masked from, sentiment badge, blurred placeholder, CTA **Upgrade to Pro — monthly**
   - Pro: full body, “Draft reply”, “Mark meeting booked”

### `/app/billing`
- Stripe Checkout for Pro monthly price
- Manage subscription

### Plan enforcement UI
- If free clicks reply body → upgrade modal

---

## 8. Stripe

- Products: `replo_pro_monthly`
- Checkout Session mode subscription
- Webhook updates org plan
- Use Stripe test keys from env; if missing, implement `BILLING_MOCK=true` that toggles plan via `/app/billing/mock-upgrade` **only when mock enabled**

---

## 9. SDK (`packages/sdk`)

```ts
const client = new ReploClient({ apiKey, baseUrl });
await client.research.fromUrl({ url });
await client.emails.find({ fullName, domain });
await client.campaigns.create(...)
```

Web server components/actions use this SDK exclusively for platform operations.

---

## 10. Implementation phases (execute in order, do not skip)

### Phase 0 — Bootstrap monorepo
- pnpm workspaces, packages, apps, eslint/tsconfig base
- docker-compose postgres
- drizzle schema + first migration
- README root

### Phase 1 — Enrichment package + tests
- All resolve logic + unit tests green

### Phase 2 — API core
- Hono/Next API server
- API keys, bootstrap internal
- health, jobs table runner
- research/from-url (fetcher + mock LLM)
- emails/find + verify
- messages/generate
- campaigns CRUD + leads + resolve + launch (simulated)
- replies list with redaction
- OpenAPI
- API tests green

### Phase 3 — Web app
- Auth + bootstrap org/key
- Full UI flow
- Inbox lock/unlock by plan
- Billing mock + Stripe wiring

### Phase 4 — Polish
- Seed demo script
- CI workflow
- docs ARCHITECTURE, API, PRODUCT
- `pnpm test` && `pnpm build` full monorepo
- Fix all failures

### Phase 5 — Final verification script
Add `pnpm smoke` that:
1. boots against test DB or uses vitest integration
2. creates org via bootstrap
3. research mock url
4. seed leads
5. resolve
6. launch
7. simulate reply
8. assert free redaction
9. upgrade mock pro
10. assert full reply visible

**Stop only when Phase 5 passes.**

---

## 11. Coding standards

- TypeScript strict; no `any` unless unavoidable and commented
- Zod validate all external inputs
- Structured errors: `{ error, code, details? }`
- Idempotency-Key header support on POST create campaign / launch
- Logging: pino or console with request id
- Security: hash API keys (sha256), never log raw keys/bodies of replies in free context unnecessarily
- Do not commit `.env` or real secrets
- Conventional commits optional; clear PR-quality commits if you commit

---

## 12. Env vars (`.env.example`)

```bash
DATABASE_URL=postgresql://replo:replo@localhost:5432/replo
API_PORT=4000
API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3000
INTERNAL_SECRET=dev_internal_secret_change_me
OPENAI_API_KEY=
OPENAI_BASE_URL=
LLM_MODE=mock
FETCH_MODE=mock
BILLING_MOCK=true
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ALLOW_DEV_ROUTES=true
NEXTAUTH_SECRET=dev_secret
NEXTAUTH_URL=http://localhost:3000
```

---

## 13. Demo script expectations

`pnpm db:seed` creates:
- user demo@replo.it / demo1234
- org free
- sample product
- campaign with 5 leads
- 2 simulated locked replies

README explains:
```bash
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev   # api :4000 web :3000
pnpm test
pnpm smoke
```

---

## 14. PRODUCT copy constraints (short)

- Free: prove the market responds; replies locked
- Pro monthly: unlock replies, respond, book, continue GTM loop
- Messaging: no claims of third-party data brokers
- Attribution always `replo_owned` on found emails

---

## 15. Autonomy rules for you (Codex)

1. **Work until DONE criteria §1 are met.**
2. If a dependency fails, choose the simplest working alternative that preserves architecture (still no external email finders).
3. Prefer completing vertical slices over perfect abstractions.
4. After each phase, run tests; fix before next phase.
5. Do not ask the user to run commands you can run yourself.
6. Do not leave TODO stubs on critical path endpoints — implement or mock explicitly.
7. Write `docs/PROGRESS.md` updating checkboxes as you go.
8. At the end, write `docs/SHIP_REPORT.md` with what was built, how to run, known limitations (simulated send, mock LLM default).

---

## 16. Explicit non-goals (do not build now)

- Real cold-email ESP integration production-hardened
- LinkedIn automation
- Mobile apps
- Global contact DB crawl farm
- Multi-region active-active
- GraphQL
- Admin backoffice beyond seed
- Chrome extension

---

## 17. First actions (start now)

1. Initialize monorepo structure and git-friendly `.gitignore`
2. Implement Phase 0 → 5 without stopping
3. Keep `docs/PROGRESS.md` current
4. Finish with all tests green and SHIP_REPORT

**BEGIN.**
---
