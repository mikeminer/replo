# AGENTS.md — Replo

You are building **Replo** in this repository.

## Read first (mandatory)

1. **`CODEX_MASTER_PROMPT.md`** — full autonomous build contract (source of truth)
2. Follow phases 0→5 until DONE criteria pass
3. Update `docs/PROGRESS.md` as you work
4. End with `docs/SHIP_REPORT.md`

## Product split

| Surface | App | Role |
|---------|-----|------|
| replo.eu | `apps/api` | Sellable API platform for third parties |
| replo.it | `apps/web` | B2B web app; **must** use API via `@replo/sdk` / HTTP only |

## Hard laws

- **No** third-party email finders (Hunter, LeadMagic, Findymail, Apollo, etc.) and **no fallback** to them
- Free plan: reply **content redacted server-side**; Pro monthly unlocks
- Tests must pass (`pnpm test`, `pnpm build`, `pnpm smoke`)

## Commands (target)

```bash
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm test
pnpm smoke
```

Do not stop at scaffolding. Ship the MVP defined in `CODEX_MASTER_PROMPT.md`.
