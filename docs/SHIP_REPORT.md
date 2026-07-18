# SHIP REPORT

## Outcome

Replo is a site-to-prospect research and email-composition product:

- Web: `https://replo.it` — Next.js, consuming the API only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono research and owned-resolution surface

The primary workflow starts from the user's product URL, not a mailing list. It analyzes the site, infers the customer side of the go-to-market motion when needed and builds a territory/intent-aware source plan. Product/category terms are separated from buyer-company traits, decision-maker roles and demand triggers. For an outbound product, Replo therefore searches for growing or expanding B2B companies and commercial leaders instead of other lead-generation vendors. Europages is used for EU discovery; WLW and XING company pages for DACH; Netcomm, ICE and Unioncamere for Italy; Viadeo company pages for France; and EU-Startups, Startup Europe, Codemotion or Developers Italia when the buyer context makes them relevant. These sources discover and qualify companies only: Replo follows them to official company domains, then crawls official company/team/contact pages. No third-party email finder is used.

Candidate official sites are checked against an offer fingerprint before any person or email is accepted. A company presenting the same solution or an adjacent sales-training, coaching or enablement service is rejected as a competing vendor; a buyer definition explicitly naming that supplier category can override the exclusion. The API and Italian UI expose the inferred target, decision-makers and applied competitor policy so the interpretation is auditable.

The search depth is adaptive: depending on the requested result count, the server receives a 49–71 second global research budget, checks individual sources with bounded timeouts, and verifies companies in batches of eight. Larger searches can inspect up to 54 official domains. The web SDK allows 95 seconds for the complete response. Buyer-specific vertical queries and direct `/team`, `/chi-siamo` and `/azienda` role queries surface named decision-makers; negative supplier terms reduce agency/consultancy noise before official-site verification.

Osservatori.net and curated maps of Italian tech communities are context-only inputs for market language and taxonomy. They are never crawled for names or addresses. The UI exposes the selected channels, their role and whether they produced useful intermediate evidence, so a zero-result search is explainable rather than a generic dead end.

False positives are deliberately rejected: generic mailboxes, role/navigation/department labels mistaken for names, testimonials or clients mistaken for employees, guessed team pages that duplicate the homepage, publishers/directories used as contact sources, placeholder theme teams and companies outside the requested territory. A matching country-code domain is accepted directly; generic domains need an operational location phrase, local telephone prefix or legal identity, while a bare country list is rejected. A conflicting country-code domain is rejected even when its global navigation mentions the requested market. Published abbreviated addresses such as `p.testa@azienda.it` are matched back to the full person name on the same official page; generated patterns remain visibly marked “da verificare” with reduced confidence and are allowed only from genuine identity/team pages.

For every prospect, the web app now generates a complete visible draft: destination address, recipient name and company, subject, personalized body, sender name/signature and source evidence. The user can copy the entire email or open it via `mailto:` in the company's existing email client.

The selected visual identity is live without redrawing the supplied artwork: `image (4).jpg` provides the light navigation mark, while `image (6).jpg` provides the dark app wordmark. Next.js metadata routes create a square 64×64 site icon and a 180×180 dark app/Apple icon with deterministic crops of those originals.

## Product decision: no platform sending

Campaign launch, managed mailbox status, reply locking, inbox and deliverability controls have been removed from the user-facing web product. Historical Smartlead/provider code remains isolated in the backend but is dormant and is no longer a Day-1 dependency. The current workflow requires no ESP key, warmup, DKIM/tracking record, reply webhook or test send.

Pricing no longer sells reply unlocks or sending volume. Free exposes the current workflow; Pro is explicitly labeled “in arrivo” and has no checkout until its research/team features exist.

## Acceptance gates

- A mailing list is never requested.
- The inferred target describes likely customers and their decision-makers, not companies selling the same product category.
- Competing vendors are excluded before contact extraction unless the user explicitly names them as the buyer.
- Recipient and sender names are present in every generated message.
- “Copia email completa” includes destination, recipient name/company, subject and body in one clipboard payload.
- “Apri nella mia email” hands the prefilled draft to the user's email client without sending from Replo.
- Every prospect retains a public source link and confidence state.
- `apps/web` reaches the backend through `@replo/sdk`, not API internals.
- Old inbox and deliverability URLs redirect to the new research flow.

Operational state is maintained in [OPS_STATE.md](./OPS_STATE.md).

## Production verification

- API deployment `dpl_AC3SrGZvoijU2jtwcmE2YfRUaA2r`: `READY`, aliased to `api.replo.eu`.
- Web deployment `dpl_DVxAuuLSurzi7b6MFp2fk74uWQDW`: `READY`, aliased to `replo.it`.
- Automated gates: 28 tests, full TypeScript lint, no-finder guard, all workspace builds and smoke checks passed. Regression coverage proves that software, consulting and sales-training/coaching competitors are rejected; a bare country mention or conflicting country-code domain cannot satisfy territory; department titles such as “Direttore Commerciale Italia” cannot become contacts; and an explicitly requested supplier category can still override the competitor filter.
- Chrome gate: the real production Italy search at limit 6 and without a buyer override scanned 8 official sites and returned 5 named prospects: commercial leaders and founders at BISY and Globalsider. Mercuri Croatia/Global and `Direttore Commerciale Italia` were absent. Every source was a genuine official `/team` or `/chi-siamo` page. The visible drafts contained recipient and sender names plus `Verifica QA · Replo`; “Copia email completa” executed successfully.
- Production API gate: a direct `api.replo.eu` request returned `exclude_competing_vendors`, the inferred customer-side target and the same BISY/Globalsider official-source contacts. Vercel build logs contain no errors; runtime observability shows only HTTP 200 responses for the exercised API/web deployments and no runtime errors.
