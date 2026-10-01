# Deployment Runbook — ISALWA OS

Provider-neutral procedure. **Build once → host where ISALWA chooses.**

**Verification tier:** DOCUMENTED + LOCAL/TEST smoke. Production deploy steps depend on final host (CONDITIONAL).

---

## Principles

1. One build artifact for `os-api` (includes outbox worker).
2. One build artifact for `os-web` when UI is deployed.
3. Migrations run against `OS_DATABASE_URL` **before** or **during** deploy window — never skip on production.
4. Roll back application first; database rollbacks require backup restore (forward-fix preferred).

---

## Prerequisites

- Node.js ≥ 22, pnpm 9 (`packageManager` in root `package.json`)
- PostgreSQL 16 reachable from API host
- Environment variables per [ENVIRONMENT_MAP.md](./ENVIRONMENT_MAP.md)

---

## 1. Install and build

From monorepo root:

```bash
pnpm install
pnpm --filter @isalwa/os-database prisma:generate
pnpm --filter @isalwa/os-api build
pnpm --filter @isalwa/os-web build    # when deploying UI (Agent 4)
```

Optional full monorepo check:

```bash
pnpm typecheck
pnpm --filter @isalwa/os-database test   # requires OS_DATABASE_URL
pnpm --filter @isalwa/os-api test
```

---

## 2. Database migration

```bash
export OS_DATABASE_URL="postgresql://USER:PASS@HOST:5432/DBNAME"
pnpm --filter @isalwa/os-database migrate:deploy
```

**Review rule:** Every new folder under `packages/os-database/prisma/migrations/` must be human-reviewed before production apply.

**Failed migration:** Stop deploy. Do not manually edit `_prisma_migrations` without runbook approval. Prefer forward-fix migration. See [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md) § Failed migration.

---

## Migration operations (Prisma)

**Location:** `packages/os-database/prisma/migrations/`

### Create (development only)

```bash
export OS_DATABASE_URL=postgresql://isalwa:isalwa@localhost:5432/isalwa
pnpm --filter @isalwa/os-database migrate:dev --name descriptive_name
```

Creates SQL under `prisma/migrations/<timestamp>_descriptive_name/`. Commit migration folder with application code change.

### Review (required before production)

1. Read generated SQL — flag `DROP`, `TRUNCATE`, column type narrowing.
2. Confirm ADR/evidence updated if schema crosses lane boundaries.
3. Run integration tests: `pnpm --filter @isalwa/os-database test`.
4. **Backup before destructive change** ([BACKUP_RESTORE_RUNBOOK.md](./BACKUP_RESTORE_RUNBOOK.md)).

### Deploy (all non-dev environments)

```bash
export OS_DATABASE_URL=...
pnpm --filter @isalwa/os-database migrate:deploy
```

Uses `prisma migrate deploy` — applies pending migrations only; no shadow database.

### Failed migration handling

| Situation | Action |
|-----------|--------|
| SQL error mid-migration | Stop. Assess `_prisma_migrations`. Prefer **forward-fix** new migration. |
| Partial apply | Do not hand-edit production without backup. Restore or forward-fix with DBA review. |
| Wrong migration merged | Revert code; if not yet deployed — remove from branch. If deployed — forward-fix only. |

### What NOT to do manually

- Do not run `prisma db push` against production.
- Do not delete rows from `_prisma_migrations`.
- Do not apply ad-hoc DDL on production without matching Prisma migration in repo.
- Do not use legacy `packages/database` migrations for `os_*` schema.

---

## 3. Start os-api

### Development

```bash
export OS_DATABASE_URL=...
pnpm dev:os-api
# Listens http://localhost:4001/v1/health
```

### Production-shaped

```bash
export OS_DATABASE_URL=...
export OS_AUTH_MODE=supabase
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
export NODE_ENV=production
export OS_API_PORT=4001

pnpm --filter @isalwa/os-api start
# node dist/main.js
```

Worker starts automatically unless `OS_OUTBOX_WORKER=0`.

The overdue attention clock starts with the same process unless `OS_ATTENTION_CLOCK=0`. It does not wait for an outbox event. See [OVERDUE_ATTENTION_CLOCK.md](./OVERDUE_ATTENTION_CLOCK.md).

---

## 4. Start / deploy os-web

When available (Agent 4 owns implementation):

```bash
export NEXT_PUBLIC_OS_API_URL=https://your-api.example/v1
export NEXT_PUBLIC_OS_AUTH_MODE=supabase
# + Supabase public vars
pnpm --filter @isalwa/os-web build
pnpm --filter @isalwa/os-web start   # or host static output per platform
```

Development:

```bash
pnpm dev:os-web   # port 3200
```

**Do not** point os-web at legacy `apps/web` API.

---

## 5. Health checks

Pre-deploy (before traffic):

```bash
./scripts/os-production-preflight.sh
```

Runtime:

```bash
curl -s http://HOST:4001/v1/health          # liveness
curl -s http://HOST:4001/v1/health/ready    # readiness (503 when not ready)
./scripts/os-health-check.sh                # OS_API_BASE=http://HOST:4001/v1
OS_HEALTH_CHECK_READINESS=1 ./scripts/os-health-check.sh
```

Authenticated ops (requires admin session):

```bash
curl -s -H "Authorization: Bearer ..." \
  -H "x-os-organization-id: ..." \
  https://HOST/v1/operations/outbox
```

---

## 6. Rollback decision points

| Situation | Action |
|-----------|--------|
| Bad application build, DB unchanged | Redeploy previous API/web artifact |
| Bad migration already applied | **Do not** guess. Restore from backup or ship forward-fix migration |
| Outbox worker misbehaving | Set `OS_OUTBOX_WORKER=0`, redeploy, fix, re-enable |
| Auth misconfiguration | Roll back env vars + redeploy; verify JWT → AuthIdentity mapping |

---

## 7. Post-deploy smoke (minimum)

1. `GET /v1/health` → `status: ok`
2. Authenticated `GET /v1/parties` (or dev bootstrap + query)
3. `GET /v1/operations/outbox` — pending count not growing unbounded after idle period
4. UI login (supabase or dev) if os-web deployed

Foundation verification suite (LOCAL/TEST):

```bash
./scripts/verify-step-14-2.sh
./scripts/verify-step-15-1.sh
```

---

## 8. What NOT to do

- Do not run `prisma migrate dev` against production (dev-only — creates shadow DB).
- Do not apply SQL by hand except documented emergency with backup.
- Do not deploy os-api without `OS_DATABASE_URL` in production (`NODE_ENV=production` enforces).
- Do not run two different migration sources (legacy `packages/database` vs `os-database`) on the same OS schema.

---

## Hosting notes (intentionally provider-neutral)

| Concern | Portable approach |
|---------|-------------------|
| API hosting | Any Node 22 host: VM, container, PaaS |
| Postgres | Any managed or self-hosted PostgreSQL 16 |
| Auth | Supabase Auth (current adapter) — swappable via `AuthProviderPort` |
| TLS / domain | Configure at reverse proxy or platform edge |
| Secrets | Platform secret store or `.env` on server — never git |

Specific Vercel/AWS/Supabase **hosting** choices are **REQUIRES_DECISION** at ISALWA level.
