# OPS STATE

Updated: 2026-07-18 Europe/Rome

- Product mode: research + copy-ready email; in-platform sending has been removed from the user-facing workflow
- Web: `https://replo.it` — Next.js, API access only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono; `/health` and OpenAPI available
- Autonomous GTM: `/app/campaigns/new`; product URL → site analysis → public-web discovery → official company/team/contact sources → one complete personalized email per prospect
- Smart discovery: customer-side buyer inferred from the product when omitted; the engine separates the seller's offer from buyer-company traits, decision-maker roles and demand triggers. Territory and buyer intent select a visible channel plan. Europages covers EU discovery; WLW and XING company pages reinforce DACH; Netcomm, ICE and Unioncamere reinforce Italy; Viadeo company pages reinforce France; EU-Startups, Startup Europe, Codemotion and Developers Italia support startup/tech discovery when relevant
- Source hierarchy: marketplaces, networks, communities and institutional registers are discovery bridges only. Names and addresses are accepted only from the prospect's official company/team/contact pages. Osservatori.net and curated Italian tech-community maps are context/taxonomy inputs and never contact sources
- Search depth: adaptive 49–71 second global budget, per-source timeouts, company verification in batches of 8 and up to 54 official domains for larger requests; direct identity/team-page queries target commercial roles and the browser client allows 95 seconds for the complete response
- Quality controls: competing software, agencies and consultancies selling the same outcome, departmental mailboxes, directory/publisher pages, placeholder/demo teams, navigation labels, testimonials/clients mistaken for employees, duplicate soft-404 team pages and off-territory companies are rejected; Italy, DACH and France searches require domain or explicit locality evidence on the official site. Generated patterns require a genuine company identity/team page. An explicit buyer that names the supplier category intentionally overrides only the competitor filter
- User input: product URL, optional buyer/territory, sender name, optional sender role/company; no mailing-list upload
- Draft output: recipient address/name/company, subject, personalized body, sender name/signature, source link, complete-copy action and `mailto:` handoff
- Brand assets: `image (4).jpg` is preserved as the light navigation mark; `image (6).jpg` is preserved as the dark app wordmark. Next.js generates a 64×64 site icon from the light mark and a clean 180×180 Apple/app icon from the dark mark
- Email execution: user's existing business mailbox; Replo neither sends nor requires ESP credentials, mailbox warmup, reply webhooks or provider DNS
- Discovery transport: browser uses `@replo/sdk` over the same-origin Vercel rewrite to `api.replo.eu`
- Discovery provenance: publicly visible emails are labeled `pubblicata`; owned-domain patterns remain labeled `da verificare`
- Pricing: Free is usable now; Pro is visibly “in arrivo” and cannot be purchased, preventing payment for unimplemented research/team features
- Legacy provider code: retained server-side but dormant and absent from navigation/product flows
- Active sending provider: none. `/health` reports the dormant backend mock adapter, but the production research/copy workflow neither sends email nor calls Smartlead/Instantly
- Domains: `replo.it` and `api.replo.eu`; Vercel ownership verified; authoritative DNS at Register.it
- Mail DNS: existing Register.it MX/SPF preserved; no product operation requires further mail DNS changes
- Secrets: no plaintext credentials are recorded in this file
- Production deployments: API `dpl_3hWUn1CcAXzE1axbFwsKm1erAueM`; web `dpl_DVxAuuLSurzi7b6MFp2fk74uWQDW`; both `READY` with aliases `api.replo.eu` and `replo.it`. Build logs contain no errors
- Verification: 25 automated tests passed, including buyer-side GTM inference, software/service competitor rejection, explicit buyer override, testimonial ownership and false-label controls; monorepo lint, no-finder guard, build and smoke passed. Chrome exercised the real production flow with `https://replo.it`, no buyer override, Italy and limit 6: the UI inferred growing/expanding B2B companies and commercial leaders, scanned 8 official sites, excluded competing vendors and produced 5 complete named emails for BISY (B2B SaaS) and Globalsider (steel service center) from genuine `/team` and `/chi-siamo` pages. Recipient name, `Mario Rossi` and `Direttore commerciale · Azienda Demo` were present in the visible draft and the complete-copy action executed. Direct production API calls returned the same buyer policy and official-source prospects. Vercel recorded only HTTP 200 responses for the exercised deployments and no runtime errors

No `BLOCKERS.md` exists because the current product can be delivered without a payment method or third-party ESP account.
