# Hosting recovery inventory (2026-11-13, read-only)

No deployment, resume, database migration, DNS change, deletion or plan change was made. Provider facts below were read on 2026-11-13 through the Vercel MCP, the Render CLI (interactive device sign-in by Carmen; no token in chat) and read-only Render API `GET`s.

## Target and source

- Target: the newer commercial release, `ct3/v1-repairs` @ `44958998caa778782a0b466b807510212d532f1d` (allowlisted export `isalwa-source-44958998.tar.gz`, see `TRANSFER_CLEARANCE.md`). It is on no remote.
- **Older version, not to be deployed:** GitHub `carmen-ship-it/ISALWA-DEMO` `main` @ `1f767fa1` (2026-09-14), an ancestor of the target. Both suspended Render services build from that repo and branch.

## Runtime dependencies (from code at `44958998`)

| Component | What it is | Needs |
|---|---|---|
| os-web | Next.js (`next build`, `next start --port $PORT`) | `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| os-api | Node HTTP service (`tsc` → `node dist/main.js`), health `/v1/health` | `OS_DATABASE_URL`, `OS_AUTH_MODE`, `OS_CORS_ORIGINS`, `OS_RUNTIME_PROFILE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Worker | Outbox worker **inside os-api** (`OS_OUTBOX_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`); no separate worker service | — |
| Database | PostgreSQL 16 via Prisma; schema by `prisma migrate deploy` (40 migrations at target) | Business system of record |
| Auth | Supabase Auth (login identities only; business data is in Postgres) | Supabase project |
| File storage | **None in current code** (planned only) | — |

A Vercel web deployment does **not** replace os-api, the outbox worker or Postgres.

## Provider state

| Provider | Finding |
|---|---|
| Vercel | Account `carmen-ship-it` (carmenaburoda@gmail.com, MFA on), one team `carmen-ship-its-projects`, plan **Hobby**, **0 projects** (the older `isalwa-demo` / `isalwa-architect` Vercel apps no longer exist in this account). Vercel Terms: "You shall only use the Services under a Hobby plan for your personal or non-commercial use." Commercial use on Vercel needs **Pro** ($20 per developer seat per month plus usage). Not changed. |
| Render | Workspace "carmen abu roda" (`tea-dajbts3m8hqs73fmlv30`, carmenaburoda@gmail.com). Three resources, all **suspended by `billing`** since 2026-10-11 02:51 UTC: Postgres `isalwa-os-staging` (`dpg-dajd3kh5efls738falcg-a`, PG16, plan `0.1c-256mb`, 1 GB, virginia); web `os-api-staging` (`srv-dajd64gae00c739gpk20`, `0.5c-512mb`); web `os-web-staging` (`srv-dajddb67bikc73bl42q0`, free). Both web services: repo `carmen-ship-it/ISALWA-DEMO`, branch `main`, auto-deploy off. |
| Render DB recovery | `GET …/recovery`: `recoveryStatus AVAILABLE`, `startsAt 2026-10-02T07:40:09Z`. `GET …/export`: none. **Data is retained, not deleted**, and is inaccessible while billing-suspended. |
| Off-host copy | One local dump `~/.isalwa-secrets/staging-backups/isalwa-os-staging-20260913T174629Z.dump` (129 KB, 2026-09-13), with a restore-drill log. It predates the Sept 15–21 staging fixture work, so it is not current. Restore re-verified 2026-11-13 in an isolated socket-only PG16 cluster: exit 0, 43 tables, 9 migrations (latest `20260824220000_os_step16_1a_party_timeline`), 1 organization, 1 party (Step17 seed), 2 auth identities (both `@isalwa.demo`), no import tables. It does **not** contain the real customer import. |
| Supabase Auth | Project host `qbpxuywtoycjpitxoblo.supabase.co` **does not resolve** (supabase.com reachable). Probably paused or deleted; UNPROVEN until a Supabase dashboard sign-in. Credentials files for it exist locally (not read). |

## What the existing data is

**Correction 2026-11-13 (superseding the earlier "synthetic only" statement):** `isalwa-os-staging` is the staging database, but it is **not synthetic only**. `docs/operations/V1_LAUNCH_SUPPORT_READINESS.md` records a real `xls_datos_clientes` import batch on staging (source `DATOS CLIENTES (1).xls`) that must be protected and not reversed. The live contents are UNKNOWN because the database is billing-suspended and Render refuses an export (`400 cannot trigger a backup for a suspended database`). The 2026-09-13 local dump restores cleanly but contains only bootstrap/synthetic data (9 migrations, no import tables). See `RENDER_EXIT_PLAN.md`.

A production database (`isalwa-os-prod`) was never evidenced. A new database is a new environment with `migrate deploy`, not a migration of the staging data, and must be described that way.

## Superseded recommendation

**Superseded 2026-11-13 by the owner direction to exit Render** (no payment, no resume). The replacement plan is in `RENDER_EXIT_PLAN.md`. The original recommendation is kept below for the record.

Stay on Render, where the configuration and the retained data already are:

1. **Resolve the Render billing suspension** (paid; amount not visible via API, check the Billing page). Resume **only** the Postgres instance first, then take a `pg_dump` off-host copy immediately and verify row counts against the 2026-09-13 drill.
2. **Do not resume `os-api-staging` or `os-web-staging` as configured.** They point at the older `ISALWA-DEMO` `main`. A resume could restart the old build. First publish the allowlisted export to a new private repository (owner decision on host and name), repoint both services to it, and only then resume and deploy, through an explicitly authorized deploy step.
3. os-api: one Render web service on a paid instance with the outbox worker enabled in-process, and `prisma migrate deploy` as the pre-deploy step after a backup.
4. os-web: one Render web service on a paid instance. The free plan spins down and is not suitable for commercial use. Vercel is optional and would need Pro.
5. Auth: recover the Supabase project if it is only paused, otherwise a new Supabase Auth project plus re-invites (users and roles are in Postgres). For commercial use, avoid a free tier that pauses on inactivity.

Paid requirements to approve before any change: Render billing resolution plus paid instances for os-api, os-web and Postgres; Supabase plan if a non-pausing tier is needed; Vercel Pro only if the web is hosted there. Planning estimates exist in `docs/handoff/ISALWA_OPERACION_COSTOS_SEGURIDAD_V1.md` and are marked as estimates there.
