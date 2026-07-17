# SHIP REPORT

## Outcome

Replo is a site-to-prospect research and email-composition product:

- Web: `https://replo.it` — Next.js, consuming the API only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono research and owned-resolution surface

The primary workflow starts from the user's product URL, not a mailing list. It analyzes the site, infers the buyer context when needed and builds a territory/intent-aware source plan. Europages is used for EU discovery; WLW and XING company pages for DACH; Netcomm, ICE and Unioncamere for Italy; Viadeo company pages for France; and EU-Startups, Startup Europe, Codemotion or Developers Italia when the buyer context makes them relevant. These sources discover and qualify companies only: Replo follows them to official company domains, then crawls official company/team/contact pages. No third-party email finder is used.

The search depth is adaptive: depending on the requested result count, the server receives a 36–53 second global research budget, checks individual sources with bounded timeouts, and verifies companies in batches of eight. Larger searches can inspect up to 42 official domains. The web SDK allows 65 seconds for the complete response, while targeted team/leadership queries and page prioritization surface named decision-makers before generic homepages.

Osservatori.net and curated maps of Italian tech communities are context-only inputs for market language and taxonomy. They are never crawled for names or addresses. The UI exposes the selected channels, their role and whether they produced useful intermediate evidence, so a zero-result search is explainable rather than a generic dead end.

False positives are deliberately rejected: generic mailboxes, role labels mistaken for names, publishers/directories used as contact sources, placeholder theme teams and companies outside the requested territory. Italy, DACH and France searches require domain or explicit locality evidence on the official site. Published abbreviated addresses such as `p.testa@azienda.it` are matched back to the full person name on the same official page; generated patterns remain visibly marked “da verificare” with reduced confidence.

For every prospect, the web app now generates a complete visible draft: destination address, recipient name and company, subject, personalized body, sender name/signature and source evidence. The user can copy the entire email or open it via `mailto:` in the company's existing email client.

The selected visual identity is live without redrawing the supplied artwork: `image (4).jpg` provides the light navigation mark, while `image (6).jpg` provides the dark app wordmark. Next.js metadata routes create a square 64×64 site icon and a 180×180 dark app/Apple icon with deterministic crops of those originals.

## Product decision: no platform sending

Campaign launch, managed mailbox status, reply locking, inbox and deliverability controls have been removed from the user-facing web product. Historical Smartlead/provider code remains isolated in the backend but is dormant and is no longer a Day-1 dependency. The current workflow requires no ESP key, warmup, DKIM/tracking record, reply webhook or test send.

Pricing no longer sells reply unlocks or sending volume. Free exposes the current workflow; Pro is explicitly labeled “in arrivo” and has no checkout until its research/team features exist.

## Acceptance gates

- A mailing list is never requested.
- Recipient and sender names are present in every generated message.
- “Copia email completa” includes destination, recipient name/company, subject and body in one clipboard payload.
- “Apri nella mia email” hands the prefilled draft to the user's email client without sending from Replo.
- Every prospect retains a public source link and confidence state.
- `apps/web` reaches the backend through `@replo/sdk`, not API internals.
- Old inbox and deliverability URLs redirect to the new research flow.

Operational state is maintained in [OPS_STATE.md](./OPS_STATE.md).

## Production verification

- API deployment `dpl_3hFbxdmewanf9XnFowkotKNeZ2Nj`: `READY`, aliased to `api.replo.eu`.
- Web deployment `dpl_DPvYi1HyYcr8BzC8XM96E6MatRZ7`: `READY`, aliased to `replo.it`; the same-origin `/api/health` rewrite returned `ok`.
- Automated gates: 22 tests, full TypeScript lint, no-finder guard, all workspace builds and smoke checks passed.
- Chrome gate: the real production Italy search at limit 20 scanned 40 official sites and returned 8 named prospects, versus 18 sites and 4 prospects before the depth increase. No `UX Researcher` false contact was present and every final source link was an official company domain. “Copia email completa” produced a 516-character payload containing `Ciao Uljan`, `Mario Rossi` and `Direttore commerciale · Azienda Demo`. The flow completed within the stated one-minute window. A second production pass verified the light navigation mark, dark app wordmark, generated icon metadata and absence of horizontal overflow; both production icon files matched their approved local hashes.
