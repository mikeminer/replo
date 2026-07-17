# AGENTS.md — Replo

## Mandatory reads
1. **`CODEX_MASTER_PROMPT.md`** — source of truth  
2. Build until DONE criteria pass, including **real deliverability Day 1**

## Product
| Domain | Code | Role |
|--------|------|------|
| replo.eu | `apps/api` + `packages/sending` | API platform + real ESP |
| replo.it | `apps/web` | B2B app via `@replo/sdk` only |

## Hard laws
1. **No** third-party email *finders* / no finder fallback  
2. **Yes** real cold-email **sending** Day 1 via **Smartlead** (preferred) or Instantly — full client, not stub  
3. Free: reply bodies **redacted server-side**; Pro monthly unlocks  
4. Free sends from **Replo-managed** mailboxes (not user Gmail)  
5. Mocks only for CI (`SEND_PROVIDER=mock`); product path is real ESP  
6. Ship `docs/DELIVERABILITY_RUNBOOK.md` + `scripts/verify-esp-connection.ts` + `pnpm smoke:live`

## Done only when
- `pnpm test` && `pnpm build` && `pnpm smoke` pass  
- Smartlead/Instantly adapter complete + webhook reply/bounce  
- SHIP_REPORT documents real deliverability go-live  

Do not deliver a simulate-only product.
