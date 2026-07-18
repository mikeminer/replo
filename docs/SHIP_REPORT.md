# SHIP REPORT

## Replo Business e monetizzazione API — 2026-07-18

`https://replo.eu` è il portale API SaaS di Replo. Supporta registrazione e login Supabase, organizzazioni multi-account, selettore workspace, Stripe Checkout, Billing Portal e gestione autonoma delle chiavi API per `https://api.replo.eu`. Il listino pubblico è ora Startup (€7,90/mese), Partner (€49,90/mese) ed Enterprise (€247,90/mese); lo stato gratuito interno è mostrato come `Testing` e non può emettere chiavi.

`https://replo.it` usa lo stesso progetto Supabase Auth: l'utente accede con la stessa identità di `replo.eu` e tutta l'area applicativa è protetta. In `Account e API` può incollare una chiave generata sul portale business, farla verificare in tempo reale, salvarla, sostituirla o rimuoverla. La chiave è cifrata a riposo con AES-256-GCM e non viene mai restituita al browser dopo il salvataggio; l'interfaccia mostra soltanto una forma mascherata, organizzazione e piano.

Le chiavi emesse da `replo.eu` vengono mostrate una sola volta, salvate esclusivamente come hash SHA-256 e possono essere revocate dal cliente con effetto immediato. Startup applica 300 chiamate mensili e una sola chiave; Partner una chiave e chiamate illimitate; Enterprise chiamate e chiavi illimitate con etichette personalizzate. I limiti sono applicati dentro Supabase con lock transazionale, quindi resistono anche a richieste simultanee. `replo.it` non contiene credenziali nel client: il suo route handler autenticato usa prima la chiave personale cifrata e, se assente, la chiave dedicata dell'organizzazione `Replo App`.

La migrazione live ha convertito il precedente piano Pro in Partner senza perdere l'accesso. Chrome ha verificato il workspace Partner con una chiave attiva, quota `∞` e limite di una chiave. Un test E2E separato ha creato un workspace Startup temporaneo, chiamato l'API pubblica con una chiave reale, ottenuto `200`, piano `startup` e quota residua `299`, quindi eliminato le fixture. I tre prodotti/prezzi Stripe sandbox sono ora configurati in Production e Preview. Chrome ha aperto i tre Checkout reali e confermato €7,90, €49,90 e €247,90 al mese; nessun acquisto o addebito reale è stato completato. L'endpoint operativo e il token monouso impiegati per inizializzare il catalogo sono stati rimossi.

Deploy di produzione:

- Business `dpl_3NhAqp6CdUKJ8nqXG88YyHpexCw5` → `replo.eu`
- API `dpl_BAtqckR5w2mRGWsdqREV6xp5VgrE` → `api.replo.eu`
- Web `dpl_6yNWfKwyi7H6SEqnu389MCvDMHgS` → `replo.it`

Tutti i deploy sono `READY`. Sono passati 42 test automatici, lint completo del monorepo, guardia anti-email-finder e build di business/API/web. Non sono presenti segreti in repository o documentazione. I soli limiti esterni rimasti sono documentati in [BLOCKERS.md](./BLOCKERS.md).

## Outcome

Replo is a site-to-prospect research and email-composition product:

- Web: `https://replo.it` — Next.js, consuming the API only through `@replo/sdk`
- API: `https://api.replo.eu` — Hono research and owned-resolution surface

The primary workflow starts from the user's product URL, not a mailing list. It analyzes the site, infers the customer side of the go-to-market motion when needed and builds a territory/intent-aware source plan. Product/category terms are separated from buyer-company traits, decision-maker roles and demand triggers. For an outbound product, Replo therefore searches for growing or expanding B2B companies and commercial leaders instead of other lead-generation vendors. Europages is used for EU discovery; WLW and XING company pages for DACH; Netcomm, ICE and Unioncamere for Italy; Viadeo company pages for France; and EU-Startups, Startup Europe, Codemotion or Developers Italia when the buyer context makes them relevant. These sources discover and qualify companies only: Replo follows them to official company domains, then crawls official company/team/contact pages. No third-party email finder is used.

Candidate official sites are checked against an offer fingerprint before any person or email is accepted. A company presenting the same solution or an adjacent sales-training, coaching or enablement service is rejected as a competing vendor; a buyer definition explicitly naming that supplier category can override the exclusion. The API and Italian UI expose the inferred target, decision-makers and applied competitor policy so the interpretation is auditable.

The search depth is adaptive: depending on the requested result count, the server receives a 63.5–90 second global research budget, expands up to 36 discovery bridges, checks individual sources with bounded timeouts, and verifies companies in batches of eight. Larger searches can inspect up to 54 official domains. Search continuation is measured against distinct qualified company accounts rather than raw emails. The web SDK allows 95 seconds for the complete response. Buyer-specific vertical queries and direct `/team`, `/chi-siamo` and `/azienda` role queries surface named decision-makers; negative supplier terms reduce agency/consultancy noise before official-site verification.

Osservatori.net and curated maps of Italian tech communities are context-only inputs for market language and taxonomy. They are never crawled for names or addresses. The UI exposes the selected channels, their role and whether they produced useful intermediate evidence, so a zero-result search is explainable rather than a generic dead end.

False positives are deliberately rejected: generic mailboxes, role/navigation/department labels mistaken for names, testimonials or clients mistaken for employees, guessed team pages that duplicate the homepage, publishers/directories used as contact sources, placeholder theme teams and companies outside the requested territory. A matching country-code domain is accepted directly; generic domains need an operational location phrase, local telephone prefix or legal identity, while a bare country list is rejected. A conflicting country-code domain is rejected even when its global navigation mentions the requested market. Published abbreviated addresses such as `p.testa@azienda.it` are matched back to the full person name on the same official page; generated patterns remain visibly marked “da verificare” with reduced confidence and are allowed only from genuine identity/team pages.

For every prospect, the web app now generates a complete visible draft: destination address, recipient name and company, subject, personalized body, sender name/signature and source evidence. Results are account-first: only the highest-ranked relevant decision-maker for each company is returned, and a short qualified company set is never padded with second or third people from those same accounts. The user can copy the entire email or open it via `mailto:` in the company's existing email client.

Una demo interattiva pubblica è disponibile esclusivamente su `https://replo.it/app/campaigns/new` per chi non ha effettuato il login. Simula analisi, ricerca, verifica e preparazione delle email con tre aziende diverse e indirizzi riservati `.example`; non chiama l'API e non salva dati. La stessa route serve il builder reale agli utenti autenticati, mentre ogni altra pagina `/app` continua a richiedere l'accesso.

The selected visual identity is live without redrawing the supplied artwork: `image (4).jpg` provides the light navigation mark, while `image (6).jpg` provides the dark app wordmark. Next.js metadata routes create a square 64×64 site icon and a 180×180 dark app/Apple icon with deterministic crops of those originals.

## Product decision: no platform sending

Campaign launch, managed mailbox status, reply locking, inbox and deliverability controls have been removed from the user-facing web product. Historical Smartlead/provider code remains isolated in the backend but is dormant and is no longer a Day-1 dependency. The current workflow requires no ESP key, warmup, DKIM/tracking record, reply webhook or test send.

The research product does not sell reply unlocks or sending volume. API access is monetized separately through Replo Business with Startup, Partner and Enterprise entitlements; real charging remains disabled while Stripe stays in sandbox.

## Acceptance gates

- A mailing list is never requested.
- The inferred target describes likely customers and their decision-makers, not companies selling the same product category.
- Competing vendors are excluded before contact extraction unless the user explicitly names them as the buyer.
- The list contains at most one primary decision-maker per company and never fills the requested count with duplicate accounts.
- Recipient and sender names are present in every generated message.
- “Copia email completa” includes destination, recipient name/company, subject and body in one clipboard payload.
- “Apri nella mia email” hands the prefilled draft to the user's email client without sending from Replo.
- Every prospect retains a public source link and confidence state.
- `apps/web` reaches the backend through `@replo/sdk`, not API internals.
- Old inbox and deliverability URLs redirect to the new research flow.
- L'unica route applicativa anonima è il mock interattivo `/app/campaigns/new` sull'host esatto `replo.it`; preview, altri domini e tutte le altre route `/app` restano chiusi.

Operational state is maintained in [OPS_STATE.md](./OPS_STATE.md).

## Production verification

- Business deployment `dpl_3NhAqp6CdUKJ8nqXG88YyHpexCw5`: `READY`, aliased to `replo.eu`.
- API deployment `dpl_BAtqckR5w2mRGWsdqREV6xp5VgrE`: `READY`, aliased to `api.replo.eu`.
- Web deployment `dpl_6yNWfKwyi7H6SEqnu389MCvDMHgS`: `READY`, aliased to `replo.it`.
- Automated gates: 42 tests, full TypeScript lint, no-finder guard and production builds passed. Regression coverage includes all three entitlement configurations, Stripe price mapping, the strict public-demo host/route boundary, API-key hashing/authorization, AES-256-GCM credential round trips and the existing discovery controls.
- Public-demo Chrome gate: an authenticated test session was closed, `/app/campaigns/new` loaded anonymously with HTTP 200, all four simulated stages completed, all three distinct example companies appeared, selecting FormaLab changed the recipient to `marco.desantis@formalab.example`, and the copy action confirmed the complete demo email. Anonymous `/app` and `/app/account` returned 307 to `/login`.
- Chrome gate: the real production Italy search at limit 6 and without a buyer override scanned 36 official sites and returned two distinct company accounts, BISY and Globalsider, with one primary contact each and no duplicate account padding. The UI displayed “2 aziende compatibili” and the account-first policy. “Copia email completa” produced a 460-character payload containing `federico.stradi@bisy.it`, `Nome: Federico Stradi`, company, subject, `Ciao Federico`, sender `Michele` and signature `Fondatore · Replo`.
- Production runtime gate: Vercel recorded HTTP 200 for the exercised API request and HTTP 200 for both exercised web requests. Build logs contain no errors and runtime error scans for both current deployments are empty.
