# Phase 4 — Hosting preparation for evaluation candidate

Date: 2026-11-17. Candidate: `a8f3fc3a` / tree `69fcc360` (evaluation notice + inventory on top of product HEAD `b5a78be6`). Stage A remains `11e4f38b`. Dirty Batch 5B **not** included.

States: **COMMITTED** (candidate) · allowlisted export **BUILT** (outside repo) · Vercel **NOT DEPLOYED** · API host **UNDECIDED** · hosted auth **NOT VERIFIED** · Isa/Álvaro invitations **NOT STARTED**.

## Architecture (exact)

| Layer | App | Hostable on Vercel Hobby? | Notes |
|---|---|---|---|
| Web | `apps/os-web` Next.js | Yes | Needs `NEXT_PUBLIC_OS_API_URL` → live API `/v1` |
| API | `apps/os-api` Nest | **No** (long-running) | In-process outbox + projection + attention clock |
| Worker | Same process as API | With API | Not a Cron substitute without reviewed redesign |
| Postgres | Prisma, **44** migrations on candidate | Separate free/paid DB | New empty DB + `migrate deploy` + synthetic seed only |
| Auth | Supabase Auth | Separate | Hosted must use `OS_AUTH_MODE=supabase`; no Entrar (desarrollo) |
| Private files | Payment evidence in API/DB | N/A | No object storage provider |

## Allowlisted export (built)

Outside repository: `/Users/carmen/projects/isalwa-transfer-readiness/export/`

| Field | Value |
|---|---|
| Source SHA | `a8f3fc3ab650bddea2f9596e95b1d052b7c1b32d` |
| Tree | `69fcc3608090e41b68624a1de7512d88049dc6ae` |
| File | `isalwa-source-a8f3fc3a.tar.gz` |
| SHA-256 | `cd72caa66c4b0c7c81f5b4e05018b96271d0593de86586973d87b1a4b58ac42b` |
| File count | 1859 |
| Migration dirs | 44 |
| Scan | `export-scan-a8f3fc3a.txt` — 0 private-key / JWT-like / sk_live / AKIA hits (counts only; no values printed) |
| Excluded | `.git`, `docs/**`, project-memory, `.env*`, secrets, Batch 5B WIP, apps/architect & apps/api stripped from extract |

Older `isalwa-source-44958998.tar.gz` must **not** be deployed.

## Vercel account

- MCP user auth succeeded; `list_teams` returned **0 teams** for this connection.
- Scope `carmen-ship-its-projects` (`team_DEQabB6VsHaNsPpEd8VuC6Nw`) returned **403** until team authorization completes.
- One-time team consent URL was issued (expires ~10 minutes from issuance); without that grant, projects cannot be listed or created.
- No `vercel` CLI installed locally.

## Single exact deploy blocker (hosted journeys)

**Working evaluation requires a long-running API + Postgres + Supabase Auth.** Vercel can host os-web only. Without an authorized always-on API host (and a database + active Supabase project), deploying web alone is **not** “the system deployed.”

Compatible no-cost / low-cost options (not chosen here):

1. **Web on Vercel + API on a free always-on trial** (Fly/Railway/Render free tiers if any remain usable without purchase) — may still need payment method (H1).  
2. **Local/VPN evaluation** for Isa/Álvaro until API host is named.  
3. **Owner purchases** Fly+Neon/Supabase Pro (prior estimate ~$43–59/month) — BUSINESS_DECISION_REQUIRED.

Additional blockers: team Vercel grant (H4), Supabase project active + redirect URLs (H6), exact Isa/Álvaro emails for invitations (do not guess).

## Authorized next steps (when blockers clear)

1. Complete Vercel team grant for `carmen-ship-its-projects`.  
2. Create project `isalwa-os-web-evaluation` from the allowlisted tarball (CLI upload or single-commit private repo — **not** `ct3/v1-repairs` history).  
3. Set evaluation env: `NEXT_PUBLIC_OS_EVALUATION_NOTICE=1`, `NEXT_PUBLIC_OS_AUTH_MODE=supabase`, `OS_RUNTIME_PROFILE=evaluation`, API URL to the chosen API host.  
4. Provision empty Postgres 16, migrate 44, synthetic seed only.  
5. Host API with workers enabled; verify `/v1/health`.  
6. Invite Isa/Álvaro with purpose-specific roles after emails are supplied.  
7. Run hosted verification checklist from CONTINUATION Phase 4.

## Rollback

- Vercel: remove/disable the evaluation project deployment; unset env.  
- API/DB: stop machine; drop evaluation database only (never Render staging).  
- Auth: remove evaluator invites; rotate keys if leaked.  
- Source: keep candidate SHA pinned; do not push restricted history.

## Not done / not claimed

INDEPENDENTLY REVIEWED · DEPLOYED AS EVALUATION · HOSTED JOURNEYS VERIFIED · ISA REVIEWED · ÁLVARO REVIEWED · OWNER ACCEPTED · PRODUCTION READY — all **no**.
