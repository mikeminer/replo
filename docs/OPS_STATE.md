# OPS STATE

Updated: 2026-07-17 Europe/Rome

- Product mode: research + copy-ready email; in-platform sending has been removed from the user-facing workflow
- Web: `https://replo.it` — Next.js, API access only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono; `/health` and OpenAPI available
- Autonomous GTM: `/app/campaigns/new`; product URL → site analysis → public-web discovery → official company/team/contact sources → one complete personalized email per prospect
- Smart discovery: buyer inferred from the product when omitted; territory and intent select a visible channel plan. Europages covers EU discovery; WLW and XING company pages reinforce DACH; Netcomm, ICE and Unioncamere reinforce Italy; Viadeo company pages reinforce France; EU-Startups, Startup Europe, Codemotion and Developers Italia support startup/tech discovery when relevant
- Source hierarchy: marketplaces, networks, communities and institutional registers are discovery bridges only. Names and addresses are accepted only from the prospect's official company/team/contact pages. Osservatori.net and curated Italian tech-community maps are context/taxonomy inputs and never contact sources
- Search depth: adaptive 36–53 second global budget, per-source timeouts, company verification in batches of 8 and up to 42 official domains for larger requests; the browser client allows 65 seconds for the complete response
- Quality controls: departmental mailboxes, directory/publisher pages, placeholder/demo teams, role labels mistaken for people and off-territory companies are rejected; Italy, DACH and France searches require domain or explicit locality evidence on the official site
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
- Production deployments: API `dpl_3hFbxdmewanf9XnFowkotKNeZ2Nj`; web `dpl_3h9CiYjwrd4q33hczvGP7RMByxUh`; both `READY` with their custom-domain aliases
- Verification: 22 automated tests passed; monorepo lint, build and smoke passed. Chrome ran the production Italy flow at limit 20 against `replo.it`: 40 official sites scanned, 8 named prospects returned, zero `UX Researcher` false positives, every final source on an official company domain, and the clipboard payload contained recipient name, sender name and signature. The search completed within the UI's stated one-minute window and no application-origin browser errors were observed

No `BLOCKERS.md` exists because the current product can be delivered without a payment method or third-party ESP account.
