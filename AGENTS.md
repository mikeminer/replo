# AGENTS.md — Replo

## Mandatory
1. Read and execute **`CODEX_MASTER_PROMPT.md`** fully.  
2. You have **Google Chrome / browser** — use it for **all** operator work.  
3. Do **not** stop to ask the human to click dashboards, add DNS, or create API keys if you can do it in the browser.

## Product
| Domain | Code | Role |
|--------|------|------|
| replo.eu | `apps/api` + `packages/sending` | API + real ESP |
| replo.it | `apps/web` | App via `@replo/sdk` only |

## Hard laws
1. No third-party email **finders** / no finder fallback  
2. **Real** cold send Day 1 via full **Smartlead** (preferred) or Instantly client  
3. Free: replies redacted server-side; Pro monthly unlocks  
4. Free sends from **Replo-managed** mailboxes  
5. Mock sender **only** for CI  
6. Browser ops: ESP signup/keys, DNS, warmup, webhooks, Stripe product, live test send/reply, deploy if logged in  
7. Evidence: `docs/OPS_STATE.md` (redact secrets)  
8. Hard-stop only for missing payment method with no card — then `docs/BLOCKERS.md` and continue everything else  

## Done when
- Code complete + tests green  
- ESP integration complete  
- Browser go-live done as far as credentials allow  
- Real send/reply proven when keys exist  
- SHIP_REPORT includes Real deliverability Day 1  

**You do everything. Code + Chrome. No human homework.**
