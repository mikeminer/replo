# OPS STATE

Updated: 2026-07-17 Europe/Rome

- Product mode: research + copy-ready email; in-platform sending has been removed from the user-facing workflow
- Web: `https://replo.it` — Next.js, API access only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono; `/health` and OpenAPI available
- Autonomous GTM: `/app/campaigns/new`; product URL → site analysis → public-web discovery → official company/team/contact sources → one complete personalized email per prospect
- Smart discovery: buyer inferred from the product when omitted; queries fan out across multiple public search surfaces, expand editorial/list results only to reach official domains, prioritize the requested role and deduplicate/diversify companies
- Quality controls: departmental mailboxes, directory/publisher pages, placeholder/demo teams, non-person labels and off-territory companies are rejected; Italy searches require an Italian domain or explicit Italian evidence on the official site
- User input: product URL, optional buyer/territory, sender name, optional sender role/company; no mailing-list upload
- Draft output: recipient address/name/company, subject, personalized body, sender name/signature, source link, complete-copy action and `mailto:` handoff
- Email execution: user's existing business mailbox; Replo neither sends nor requires ESP credentials, mailbox warmup, reply webhooks or provider DNS
- Discovery transport: browser uses `@replo/sdk` over the same-origin Vercel rewrite to `api.replo.eu`
- Discovery provenance: publicly visible emails are labeled `pubblicata`; owned-domain patterns remain labeled `da verificare`
- Pricing: Free is usable now; Pro is visibly “in arrivo” and cannot be purchased, preventing payment for unimplemented research/team features
- Legacy provider code: retained server-side but dormant and absent from navigation/product flows
- Active sending provider: none. `/health` reports the dormant backend mock adapter, but the production research/copy workflow neither sends email nor calls Smartlead/Instantly
- Domains: `replo.it` and `api.replo.eu`; Vercel ownership verified; authoritative DNS at Register.it
- Mail DNS: existing Register.it MX/SPF preserved; no product operation requires further mail DNS changes
- Secrets: no plaintext credentials are recorded in this file
- Production deployments: API `dpl_4J9j6uzGN8KHnnhCkArwb7iJWtpS`; web `dpl_5H2fqWUJkCdUW4zUQZs1dxNVutD1`; both `READY` with their custom-domain aliases
- Verification: 16 automated tests passed; monorepo lint and build passed; Chrome confirmed Italian UI, non-empty Italy-scoped discovery, public source links, prefilled `mailto:`, complete clipboard payload and legacy-route redirects

No `BLOCKERS.md` exists because the current product can be delivered without a payment method or third-party ESP account.
