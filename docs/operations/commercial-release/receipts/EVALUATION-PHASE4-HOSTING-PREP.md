# Phase 4 — Hosting preparation for evaluation candidate

Date: 2026-11-17 (updated after Batch 5B landed). Candidate: `7ddf258b` / tree `9c42e782` (evaluation notice/docs + Batch 5B). Stage A remains `11e4f38b`. Prior export `a8f3fc3a` superseded.

States: **COMMITTED** (candidate) · allowlisted export **BUILT** (outside repo) · Vercel **NOT DEPLOYED** · API host **UNDECIDED** · hosted auth **NOT VERIFIED** · Isa/Álvaro invitations **NOT STARTED**.

## Architecture (exact)

| Layer | App | Hostable on Vercel Hobby? | Notes |
|---|---|---|---|
| Web | `apps/os-web` Next.js | Yes | Needs `NEXT_PUBLIC_OS_API_URL` → live API `/v1` |
| API | `apps/os-api` Nest | **No** (long-running) | In-process outbox + projection + attention clock |
| Worker | Same process as API | With API | Not a Cron substitute without reviewed redesign |
| Postgres | Prisma, **45** migrations on candidate | Separate free/paid DB | New empty DB + `migrate deploy` + synthetic seed only |
| Auth | Supabase Auth | Separate | Hosted must use `OS_AUTH_MODE=supabase`; no Entrar (desarrollo) |
| Private files | Payment evidence in API/DB | N/A | No object storage provider |

## Allowlisted export (built)

Outside repository: `/Users/carmen/projects/isalwa-transfer-readiness/export/`

| Field | Value |
|---|---|
| Source SHA | `7ddf258bab696e3fa3a0767d9205a03f42a46af5` |
| Tree | `9c42e782ab362d858601134e71ce2e28db7d38c0` |
| File | `isalwa-source-7ddf258b.tar.gz` |
| SHA-256 | `f945d0e311b14c6772e5b3f0ec24ab68fd19205295e24342144bf1cfb9cd2eaf` |
| File count | 1868 |
| Migration dirs | 45 |
| Scan | `export-scan-7ddf258b.txt` — 0 private-key / JWT-like / sk_live / AKIA hits (counts only; no values printed) |
| Excluded | `.git`, `docs/**`, project-memory, `.env*`, secrets, apps/architect & apps/api stripped from extract |

Superseded: `isalwa-source-a8f3fc3a.tar.gz`. Older `isalwa-source-44958998.tar.gz` must **not** be deployed.

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
4. Provision empty Postgres 16, migrate **45**, synthetic seed only.  
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
