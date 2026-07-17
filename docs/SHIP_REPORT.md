# SHIP REPORT

## Outcome

Replo is a site-to-prospect research and email-composition product:

- Web: `https://replo.it` — Next.js, consuming the API only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono research and owned-resolution surface

The primary workflow starts from the user's product URL, not a mailing list. It analyzes the site, infers the buyer context when needed, runs progressive public-web searches, follows list/editorial results only to discover official company domains, and crawls official company/team/contact pages. It ranks decision makers by the requested role and keeps territory evidence strict. No third-party email finder is used.

False positives are deliberately rejected: generic mailboxes, non-person labels, publishers/directories used as contact sources, placeholder theme teams and companies outside the requested territory. Published abbreviated addresses such as `p.testa@azienda.it` are matched back to the full person name on the same official page; generated patterns remain visibly marked “da verificare” with reduced confidence.

For every prospect, the web app now generates a complete visible draft: destination address, recipient name and company, subject, personalized body, sender name/signature and source evidence. The user can copy the entire email or open it via `mailto:` in the company's existing email client.

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

- API deployment `dpl_4J9j6uzGN8KHnnhCkArwb7iJWtpS`: `READY`, aliased to `api.replo.eu`.
- Web deployment `dpl_5H2fqWUJkCdUW4zUQZs1dxNVutD1`: `READY`, aliased to `replo.it`.
- Automated gates: 16 tests, full TypeScript lint, no-finder guard and all workspace builds passed.
- Chrome gate: a real Italy-scoped search returned named prospects with official sources; the copied payload contained recipient, name, company, subject, personalized body, `Mario Rossi` and `Direttore commerciale · Azienda Demo`; inbox and deliverability legacy URLs redirected to the research flow.
