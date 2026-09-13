# Environment Map — ISALWA OS

Conceptual environments. **No production credentials appear in this document.**

**Topology status (2026-09-13):** Staging/production shape remains as in [`PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md`](../architecture/PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md). **SUPABASE AUTH STAGING: IMPLEMENTED** (project `isalwa-os-auth-staging`, ref `qbpxuywtoycjpitxoblo`, region `sa-east-1`) — **NOT VERIFIED** until os-api login works end-to-end. Hosted os-web/os-api + managed OS Postgres still **not** provisioned.

---

## Summary

| Environment | Purpose | DB | Auth | Worker | Verification tier |
|-------------|---------|----|----|--------|-------------------|
| **LOCAL** | Engineer dev | Docker Postgres or SSH tunnel | `OS_AUTH_MODE=dev` | Co-hosted in os-api | TESTED |
| **TEST** | CI / integration / restore drill | Isolated DB (e.g. `isalwa_step17_restore`) | dev headers | Same as LOCAL | TESTED |
| **STAGING/PILOT** | Pre-production rehearsal | Managed Postgres (provider TBD) | Supabase JWT typical | os-api deploy | DOCUMENTED |
| **PRODUCTION** | Live tenant | Managed Postgres (provider TBD) | Supabase JWT | os-api deploy | DOCUMENTED only |

---

## Application components

### ISALWA OS (authoritative)

| Service | Package | Process |
|---------|---------|---------|
| OS API | `apps/os-api` | NestJS — commands, queries, outbox worker |
| OS Web | `apps/os-web` | Next.js — employee/admin shell |
| OS Database | `packages/os-database` | Prisma migrations + Postgres |

### Co-hosted worker (not a separate deploy unit today)

The outbox/projection worker runs **inside** `os-api` via `OutboxWorkerHost` (Step 14.2). Disable with `OS_OUTBOX_WORKER=0`.

### Legacy (frozen — do not use for OS handoff)

| Service | Notes |
|---------|-------|
| `apps/web`, `apps/api` | Legacy demo; uses `DATABASE_URL` not `OS_DATABASE_URL` |
| `apps/architect` | Separate product; Supabase + Vercel per [`docs/OPERATIONS_RUNBOOK.md`](../OPERATIONS_RUNBOOK.md) |

---

## Database

| Variable | Used by | Schema |
|----------|---------|--------|
| **`OS_DATABASE_URL`** | `packages/os-database`, `apps/os-api` | `os_*` tables (Prisma) |
| `DATABASE_URL` | Legacy `packages/database` only | Legacy commercial schema |

**Authoritative OS data:** Postgres database pointed to by `OS_DATABASE_URL`.

Local default (docker compose):

```
postgresql://isalwa:isalwa@localhost:5432/isalwa
```

Migrations:

```bash
export OS_DATABASE_URL=...
pnpm --filter @isalwa/os-database migrate:deploy
```

---

## Auth provider

| Mode | Env | Behavior |
|------|-----|----------|
| **dev** (development profile only) | `OS_AUTH_MODE=dev` | Session via validated headers — **blocked on staging/production** |
| **supabase** | `OS_AUTH_MODE=supabase` | JWT → Supabase user → `AuthIdentity` → `OrganizationMember` (passwords live in Supabase only) |

### Runtime profile (Step 17.0)

| Variable | Values | Purpose |
|----------|--------|---------|
| `OS_RUNTIME_PROFILE` | `development` \| `staging` \| `production` | Explicit deployment mode; defaults from `NODE_ENV` |

**Fail-closed rules (startup validation in os-api):**

- Staging/production require `OS_AUTH_MODE=supabase`, `OS_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `OS_AUTH_MODE=dev` forbidden on staging/production
- Legacy `DATABASE_URL` alone does **not** satisfy OS — must set `OS_DATABASE_URL`
- `/v1/dev/*` routes register **only** when profile=development and auth=dev

See [`STEP_17_0_PRODUCTION_SAFETY_PRECONDITIONS_EVIDENCE.md`](../architecture/STEP_17_0_PRODUCTION_SAFETY_PRECONDITIONS_EVIDENCE.md).

**os-web mirror:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_OS_AUTH_MODE` | `dev` or `supabase` |
| `NEXT_PUBLIC_OS_API_URL` | API base (e.g. `http://localhost:4001/v1`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase (production auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase anon key |

**Must match:** `OS_AUTH_MODE` on os-api and `NEXT_PUBLIC_OS_AUTH_MODE` on os-web.

### Supabase Auth — staging project (AUTH ONLY)

| Field | Value |
|-------|--------|
| Status | **IMPLEMENTED** — **NOT VERIFIED** (no hosted os-api login yet) |
| Project name | `isalwa-os-auth-staging` |
| Organization | `carmenaburoda@gmail.com` (personal) |
| Project ref | `qbpxuywtoycjpitxoblo` |
| Region | `sa-east-1` |
| Status (provider) | `ACTIVE_HEALTHY` |
| API URL hostname | `qbpxuywtoycjpitxoblo.supabase.co` |
| JWT issuer | `https://qbpxuywtoycjpitxoblo.supabase.co/auth/v1` |
| Role | Credentials / sessions / invite-reset mechanics only |
| OS business DB | **Separate** managed Postgres via `OS_DATABASE_URL` — **not yet created** for staging |
| Do not use | `Isalwa-Arquitect` (`efolotcrdaqdixfiqbek`) for OS Auth |

Secrets (`anon`, `service_role`, Auth DB password) live in operator secret store / host env — **never in git**.

---

## Required environment variables — os-api

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `OS_DATABASE_URL` | **Yes** (staging/production) | — | Prisma connection; memory fallback only in non-production without URL |
| `OS_RUNTIME_PROFILE` | Staging/production | inferred | Must be `staging` on Render (`NODE_ENV=production` would otherwise imply production) |
| `OS_AUTH_MODE` | Staging/production | `dev` only in development | Must be `supabase` for staging/production |
| `PORT` | Host-provided | — | Preferred listen port (Render injects); wins over `OS_API_PORT` |
| `OS_API_PORT` | No | `4001` | Fallback when `PORT` unset |
| `OS_API_HOST` | No | `0.0.0.0` | Bind address |
| `OS_CORS_ORIGINS` | **Yes** (staging/production) | localhost in development | Comma-separated exact origins; no `*` |
| `SUPABASE_URL` | If supabase mode | — | JWT verification + admin API base |
| `SUPABASE_ANON_KEY` | If supabase mode | — | JWT verification |
| `SUPABASE_SERVICE_ROLE_KEY` | For invite/revoke/email admin ops | — | Server only; never in browser; required for InviteMember in supabase mode |

### Worker tuning (optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `OS_OUTBOX_WORKER` | enabled | Set `0` to disable polling |
| `OS_PROJECTION_WORKER` | enabled | Alias for disable |
| `OS_OUTBOX_POLL_MS` | `5000` | Poll interval |
| `OS_OUTBOX_BATCH_SIZE` | `25` | Claim batch size |

---

## Required environment variables — os-web

See `apps/os-web/.env.example`. Copy to `apps/os-web/.env.local`.

---

## Optional / local-only flags

| Variable | Context |
|----------|---------|
| `NODE_ENV=production` | Required for production store enforcement |
| `OS_OUTBOX_WORKER=0` | API-only mode (outbox accumulates) |
| Legacy root `.env` | `ALLOW_MOCK_PROVIDERS`, Redis, etc. — legacy demo only |

---

## Secrets that must NOT live in git

- `OS_DATABASE_URL` (contains password)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (low sensitivity but still env-injected)
- Legacy `DATABASE_URL`, API keys, LLM keys
- Any `.env`, `.env.local` — gitignored

Only `.env.example` files with placeholders may be committed.

---

## Migration procedure (all environments)

1. Back up database before destructive migrations (see [BACKUP_RESTORE_RUNBOOK.md](./BACKUP_RESTORE_RUNBOOK.md)).
2. Deploy new application build (same artifact as API).
3. Run `pnpm --filter @isalwa/os-database migrate:deploy` with target `OS_DATABASE_URL`.
4. Start or restart `os-api` (worker starts on module init).
5. Verify `./scripts/os-health-check.sh` and tenant smoke.

---

## Health verification

| Check | Endpoint / command | Auth |
|-------|-------------------|------|
| API liveness | `GET /v1/health` | Public |
| API readiness | `GET /v1/health/ready` | Public (503 when not ready) |
| Pre-deploy validation | `./scripts/os-production-preflight.sh` | Local env only |
| Dev persistence mode | `GET /v1/dev/status` | Public (development profile + dev auth only) |
| Outbox backlog | `GET /v1/operations/outbox` | `people.admin` |
| Script | `./scripts/os-health-check.sh` | Public health only |

---

## Per-environment notes

### LOCAL

- Start Postgres: `pnpm dev:deps` or existing server
- Use dev auth + `POST /v1/dev/bootstrap` for first org
- Step verification scripts default to `localhost:5432`

### TEST

- Isolated DB recommended (`STEP17_TEST_DB` in restore script)
- Integration tests skip without `OS_DATABASE_URL`

### STAGING/PILOT

- Provider-neutral: any Postgres reachable from os-api host
- Supabase project for auth (or approved pilot IdP)
- Same migration + health procedure as production

### PRODUCTION

- **PRODUCTION-VERIFIED items:** not yet claimed — hosting provider not selected
- Enforce `OS_DATABASE_URL`, `NODE_ENV=production`, `OS_AUTH_MODE=supabase` (typical)
- Disable `/v1/dev/*` at edge if exposed (bootstrap is dev-oriented)
