# ISALWA OS — Production / Staging Implementation Plan

**Status:** PLAN ONLY — **not implemented, not deployed, no accounts created**  
**Date:** 2026-08-27 (reconciled **2026-09-02**)  
**Source of truth (providers):** [`PRODUCTION_PROVIDER_ARCHITECTURE_REVIEW.md`](./PRODUCTION_PROVIDER_ARCHITECTURE_REVIEW.md)  
**Audience:** Replacement senior engineer executing without Carmen  

This document turns the provider review into an executable staging + production topology. Provider choices are unchanged unless a concrete contradiction is noted.

**Contradiction check:** none that require changing providers. Gaps found are **implementation/security hardening** (CORS allowlist, Sentry SDK, GitHub Actions expansion, ISALWA account ownership), not a reason to pick Clerk, WorkOS, Redis, Vercel-as-prod, or Supabase Postgres as SoR.

---

## Current stage reconciliation (2026-09-02)

Product engineering is past the closed workforce/commercial defect cycle. **Do not reopen** Step 14.7, UI-LIVE-3, UI-LIVE-3B, or the Cliente 360 null-freshness fix.

| Area | Honest status | Authority |
|------|---------------|-----------|
| Workforce Admin (DEV browser) | **CONDITIONAL / SAFE FOR HUMAN DEV UAT** | UI-LIVE-3 + UI-LIVE-3B; Invite/Rehire/ChangeMemberEmail still blocked; email-request + Supabase browser auth unverified |
| Commercial Phase 1 (DEV) | **READY for human internal UAT** | UI-LIVE-1/2 + null-freshness closure; CreateOrder UI absent (G-02); Commercial Approval absent (G-08) |
| G-02 CreateOrder authority | **DECISION PENDING** | Decision brief PASSED; no A/B/C chosen; no CreateOrder UI |
| Human internal UAT package | **READY** (DEV auth) | `docs/uat/FIRST_HUMAN_INTERNAL_UAT_GUIDE.md` |
| Production provider review | **ACCEPTED** (recommendation) | `PRODUCTION_PROVIDER_ARCHITECTURE_REVIEW.md` |
| This staging/prod plan | **PLANNED only** | Not implemented, not verified |

**Next engineering stage:** execute infrastructure ownership + first staging slice when authorized — **not** new product features while UAT runs.

---

## How to use this plan

| Label | Meaning |
|-------|---------|
| **PLANNED** | Do this during implementation. Not done. |
| **ALREADY IN REPO** | Code/runbook exists; wire it to the host. |
| **GAP** | Must be fixed before the named gate. |
| **ISALWA DECISION** | Cannot proceed correctly without client/company input. |

Do **not** create accounts, change DNS, migrate production data, or cut over while executing *this* document. The first implementation slice is listed at the end.

Architect (`apps/architect`) is **out of scope**. It keeps its own Vercel + Supabase path.

---

# 1. Environment topology

Three environments only. No fourth “pilot on Carmen’s server.”

| | **DEV** | **STAGING** | **PRODUCTION** |
|--|---------|-------------|----------------|
| **Purpose** | Engineer laptop | Pre-prod rehearsal, synthetic data | Live ISALWA tenant |
| **os-web** | `localhost:3200` (`pnpm dev:os-web`) | Render Web Service `os-web-staging` | Render Web Service `os-web-prod` |
| **os-api** | `localhost:4001` (`pnpm dev:os-api`) | Render Web Service `os-api-staging` (worker **inside**) | Render Web Service `os-api-prod` (worker **inside**) |
| **Database** | Docker `postgis/postgis:16-3.4` or SSH tunnel to **non-prod** Postgres | Render Postgres **`osalwa-os-staging`** (isolated) | Render Postgres **`osalwa-os-prod`** (isolated) |
| **Auth project** | Optional local Supabase **or** `OS_AUTH_MODE=dev` | Supabase **`isalwa-os-auth-staging`** | Supabase **`isalwa-os-auth-prod`** |
| **Runtime profile** | `OS_RUNTIME_PROFILE=development` (default) | **`OS_RUNTIME_PROFILE=staging`** (required; Render sets `NODE_ENV=production`) | `OS_RUNTIME_PROFILE=production` |
| **Auth mode** | `dev` (default) or supabase | `supabase` only | `supabase` only |
| **Secrets source** | gitignored `.env.local` | GitHub Environment `staging` → Render env | GitHub Environment `production` → Render env |
| **Domain** | localhost | `https://app.staging.<ISALWA_DOMAIN>` + `https://api.staging.<ISALWA_DOMAIN>` | `https://app.<ISALWA_DOMAIN>` + `https://api.<ISALWA_DOMAIN>` |
| **Logs** | Terminal | Render logs | Render logs (+ Sentry) |
| **Monitoring** | None required | Sentry env `staging` + Better Stack staging checks | Sentry env `production` + Better Stack prod checks |
| **Backups** | Optional | Daily dump + provider snapshots (practice restore) | PITR + encrypted off-host dump |
| **Deploy trigger** | Local process | Merge to `main` after CI green | **Human approval** on GitHub Environment `production` — never auto from arbitrary branches |
| **Migration** | `pnpm --filter @isalwa/os-database migrate:dev` **local only** | `migrate:deploy` against staging direct URL **before** or in pre-deploy | `migrate:deploy` after backup, human-gated, direct URL |

### Isolation rules (non-negotiable)

Staging and production **must not** share:

| Asset | Rule |
|-------|------|
| Postgres | Separate instances, separate passwords, no cross-queries |
| Supabase project | Separate project refs, JWT issuers, users, service roles |
| Secrets | Separate GitHub Environments and Render env groups |
| Runtime env | Distinct `OS_RUNTIME_PROFILE`, URLs, Sentry environment |
| Service role | Never copy `SUPABASE_SERVICE_ROLE_KEY` across envs |
| Callback / redirect URLs | Each Supabase project allowlists **only** that env’s web origin |
| Cookies | Distinct hostnames → distinct cookie jars; no shared parent domain for staging/prod if avoidable |
| Domains | `staging.` prefix vs apex app host — never the same hostname |

**Carmen Cursor XL / `carmen-aws-dev` is DEV/pilot only.** It is not staging and not production.

---

# 2. Render service plan

**Services: two per environment (four total). No third worker service.**

Outbox / projection worker stays **co-hosted** in `os-api` (`OutboxWorkerHost`, `OS_OUTBOX_WORKER` default enabled). Claim uses `FOR UPDATE SKIP LOCKED` (safe if scaled later). **Initial scale: 1 instance per service.** Do not run two `os-api` replicas until an operator has confirmed outbox health under dual pollers.

No Dockerfile exists today. Use **Render Native Node**, repo root, pnpm 9.15.4, Node 22.

### Shared Render settings (all four services)

| Field | Value |
|-------|--------|
| **Region** | One region for web + API + Postgres of that environment (same region). |
| **Repo** | ISALWA-owned clone of this monorepo (see §16). |
| **Root directory** | empty (repository root) |
| **Native environment** | Node |
| **Node version** | `22` (`engines` in root `package.json`) |
| **Package manager** | pnpm via `corepack enable && corepack prepare pnpm@9.15.4 --activate` |
| **Auto-deploy staging** | `main` only, after CI (see §7) |
| **Auto-deploy production** | **OFF** — deploy hook from approved workflow only |
| **Restart** | Render restarts on health-check failure / crash |
| **Rollback** | Render → service → **Rollback** to previous successful deploy (app only; DB is not rolled back) |
| **Scaling** | Staging: 1 instance. Production: 1 instance until load evidence. |

`NEXT_PUBLIC_*` is **baked at Next.js build time**. Staging/production values must be present on **`os-web` build**, not only runtime.

---

### Service A — `os-api-staging`

| Field | Value |
|-------|--------|
| **Render type** | Web Service |
| **Name** | `os-api-staging` |
| **Runtime** | Node 22 |
| **Build** | `corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm --filter @isalwa/os-api... build` |
| **Start** | `pnpm --filter @isalwa/os-api start` (`node dist/main.js`) |
| **Pre-deploy** | `OS_DATABASE_URL=$OS_DATABASE_MIGRATE_URL pnpm --filter @isalwa/os-database migrate:deploy` **only if** a pooler exists; otherwise `pnpm --filter @isalwa/os-database migrate:deploy` using the same `OS_DATABASE_URL`. Production must **not** rely solely on this — see §8 (backup first). |
| **Health check path** | `/v1/health` (liveness — do not restart the process on a brief DB blip) |
| **Readiness** | Smoke after deploy: `GET /v1/health/ready` must be 200 |
| **Port** | Host `PORT` preferred (`resolveListenPort` in `env-validation.ts`); fallback `OS_API_PORT` then `4001`. Set nothing extra on Render if `PORT` is injected. |
| **Env** | See §5 staging os-api |
| **Branch** | `main` |
| **Instances** | 1 |

### Service B — `os-web-staging`

| Field | Value |
|-------|--------|
| **Render type** | Web Service |
| **Name** | `os-web-staging` |
| **Runtime** | Node 22 |
| **Build** | `corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm --filter @isalwa/os-web... build` |
| **Start** | `pnpm --filter @isalwa/os-web start` (`next start --port ${PORT:-3200}` — **DONE**) |
| **Health check path** | `/login` |
| **Env** | See §5 staging os-web (**build + runtime**) |
| **Branch** | `main` |
| **Instances** | 1 |

### Service C — `os-api-prod`

Same as staging with production env, auto-deploy **OFF**, pre-deploy migrate **disabled on the service** (migrate runs from the approved GitHub workflow after backup). Start command identical. Instances: 1.

### Service D — `os-web-prod`

Same as staging with production public env at **build** time. Auto-deploy **OFF**.

### Render Postgres (not a “service process”, but required)

| Name | Env | Plan requirement |
|------|-----|------------------|
| `isalwa-os-staging` | staging | PostgreSQL 16, PostGIS extension, always-on, automated backups |
| `isalwa-os-prod` | production | PostgreSQL 16, PostGIS extension, always-on, **PITR**, automated backups |

Private network only. Do **not** expose port 5432 to the public internet.

---

# 3. Database plan

### Requirements

| Requirement | Staging | Production |
|-------------|---------|------------|
| PostgreSQL 16 | Yes | Yes |
| PostGIS | `CREATE EXTENSION IF NOT EXISTS postgis;` validated on first provision | Same — **gate:** extension exists before Territorio geo, not before first staging deploy of commercial OS |
| Always-on | Yes (no scale-to-zero) | Yes |
| PITR | Preferred | **Required** |
| Isolated | Own instance | Own instance |
| Automated snapshots | Yes | Yes |
| Off-host export | Encrypted `pg_dump -Fc` to R2 bucket `isalwa-os-backups-staging` | Encrypted dump to `isalwa-os-backups-prod` |

No schema change in this plan. Prisma remains `url = env("OS_DATABASE_URL")`.

### Connection URLs

At ISALWA scale (**one API instance**), **do not introduce a pooler on day one.** Prisma + transaction-mode poolers are a known footgun.

| Variable | When |
|----------|------|
| `OS_DATABASE_URL` | Runtime **and** migrate, until a pooler exists. Prisma datasource. |
| `OS_DATABASE_MIGRATE_URL` | **Optional.** Create only when a pooler is added. Direct (session) URL. GitHub migrate job sets `OS_DATABASE_URL` from this value for `prisma migrate deploy`. Later: add Prisma `directUrl` (**SMALL CONTRACT**, no table change). |

**Never** run `prisma migrate dev` against staging or production (creates a shadow DB, can be destructive).

### Roles

| Role | Use |
|------|-----|
| App role in `OS_DATABASE_URL` | `os-api` runtime (least privilege short of a dedicated migrator) |
| Same role for migrate (initial) | Acceptable until a migrator role is split |
| Superuser | Provider console only — not in app env |

---

# 4. Auth plan

**Dedicated OS-only Supabase Auth projects.** Do **not** reuse Architect’s project (`apps/architect` / any existing Architect URL).

| | **STAGING OS AUTH** | **PRODUCTION OS AUTH** |
|--|---------------------|------------------------|
| **Project name** | `isalwa-os-auth-staging` | `isalwa-os-auth-prod` |
| **Status (2026-09-13)** | **IMPLEMENTED** (ref `qbpxuywtoycjpitxoblo`, region `sa-east-1`, `ACTIVE_HEALTHY`) — **NOT VERIFIED** until hosted os-api login | **NOT CREATED** |
| **Organization** | `carmenaburoda@gmail.com` (personal ISALWA) | TBD same boundary when created |
| **Boundary** | Auth users for staging employees/testers only | Auth users for real ISALWA staff only |
| **JWT issuer** | `https://qbpxuywtoycjpitxoblo.supabase.co/auth/v1` | `https://<PROD_REF>.supabase.co/auth/v1` |
| **API hostname** | `qbpxuywtoycjpitxoblo.supabase.co` | `https://<PROD_REF>.supabase.co` |
| **Anon / public key** | Browser `NEXT_PUBLIC_SUPABASE_ANON_KEY` + os-api `SUPABASE_ANON_KEY` (JWT verify) | Same pattern, **different key** |
| **Service role** | `os-api` only: invite, global logout, delete user, email update | Same; **never** in os-web or `NEXT_PUBLIC_*` |
| **Site URL (current)** | Placeholder `http://localhost:3200` until Render hostname exists | `https://app.<ISALWA_DOMAIN>` |
| **Redirect allowlist (current)** | localhost:3200 + Render/staging.local placeholders — **replace** with real os-web origin at host provision | Production web origin + `/login` only |
| **Invite / reset URLs** | Follow Site URL | Production Site URL |
| **MFA** | Enable TOTP **available**; required for `people.admin` / privileged roles as **OS policy + enrollment** (ISALWA DECISION on mandate date) | Same |
| **Social providers** | **Off** (verified on project) | **Off** |
| **Supabase Organizations / RLS as OS authz** | **Off / unused** | **Off / unused** |
| **Session** | Supabase cookie via `@supabase/ssr` on os-web; API sees `Authorization: Bearer` | Same; `Secure` + `SameSite=Lax`; host-only cookies on that app hostname |
| **Email** | Supabase Auth sends invite/reset mail (Resend **not** required for this plan) | Same |
| **Auth project Postgres** | Exists for Auth internals only — **NOT** `OS_DATABASE_URL` | Same rule |

### OS vs provider (unchanged)

OS owns: Person, OrganizationMember, AuthIdentity (`provider` + `providerSubject`), roles, scopes, `accessStatus`, lifecycle commands.

Supabase owns: passwords, MFA secrets, session validity, invite/reset **mechanics**.

Session rule **ALREADY IN REPO:** valid JWT is still denied if member is not `accessStatus: active`.

---

# 5. Environment variable contract

No real values. Classify:

`PUBLIC` · `SERVER_ONLY` · `SECRET` · `PROVIDER_SECRET` · `DATABASE` · `AUTH` · `MONITORING` · `RUNTIME`

### os-api

| Variable | Class | DEV | STAGING | PRODUCTION |
|----------|-------|-----|---------|------------|
| `OS_RUNTIME_PROFILE` | RUNTIME | unset or `development` | **`staging`** | **`production`** |
| `NODE_ENV` | RUNTIME | unset / `development` | `production` (Render) | `production` |
| `OS_AUTH_MODE` | AUTH | `dev` | `supabase` | `supabase` |
| `OS_DATABASE_URL` | DATABASE + SECRET | local docker URL | staging Postgres | prod Postgres |
| `OS_DATABASE_MIGRATE_URL` | DATABASE + SECRET | unset | unset until pooler | unset until pooler |
| `SUPABASE_URL` | AUTH | unset in dev-auth | staging project URL | prod project URL |
| `SUPABASE_ANON_KEY` | AUTH | unset in dev-auth | staging anon | prod anon |
| `SUPABASE_SERVICE_ROLE_KEY` | AUTH + PROVIDER_SECRET + SERVER_ONLY | unset unless testing invite | **required** for admin lifecycle | **required** |
| `OS_API_PORT` | RUNTIME | `4001` | Optional; host `PORT` wins | Optional; host `PORT` wins |
| `OS_CORS_ORIGINS` | RUNTIME | `http://localhost:3200` (default if unset in development) | staging web origin **only** (**required**) | prod web origin **only** (**required**) |
| `OS_API_HOST` | RUNTIME | `0.0.0.0` | `0.0.0.0` | `0.0.0.0` |
| `OS_OUTBOX_WORKER` | RUNTIME | unset (on) | unset (on) | unset (on) |
| `OS_PROJECTION_WORKER` | RUNTIME | alias; do not set `0` | same | same |
| `OS_OUTBOX_POLL_MS` | RUNTIME | default 5000 | default | default |
| `OS_OUTBOX_BATCH_SIZE` | RUNTIME | default 25 | default | default |
| `SENTRY_DSN` | MONITORING + SECRET | unset | staging DSN | prod DSN |
| `SENTRY_ENVIRONMENT` | MONITORING | `development` | `staging` | `production` |

`OS_CORS_ORIGINS` is **IMPLEMENTED** (`env-validation.ts` + `main.ts` exact-origin allowlist; fail-closed on staging/production). Sentry DSNs remain **PLANNED**. Host `PORT` is honored for os-api and os-web.

### os-web

| Variable | Class | DEV | STAGING | PRODUCTION |
|----------|-------|-----|---------|------------|
| `NEXT_PUBLIC_OS_AUTH_MODE` | PUBLIC + AUTH | `dev` | `supabase` | `supabase` |
| `NEXT_PUBLIC_OS_API_URL` | PUBLIC | `http://localhost:4001/v1` | `https://api.staging.<ISALWA_DOMAIN>/v1` | `https://api.<ISALWA_DOMAIN>/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC + AUTH | unset | staging URL | prod URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC + AUTH | unset | staging anon | prod anon |
| `NEXT_PUBLIC_SENTRY_DSN` | PUBLIC + MONITORING | unset | staging browser DSN | prod browser DSN |
| `NODE_ENV` | RUNTIME | development | production | production |

Must match: `OS_AUTH_MODE` ↔ `NEXT_PUBLIC_OS_AUTH_MODE`; Supabase URL on web ↔ API.

### CI / host-only (not app)

| Variable | Class | Where |
|----------|-------|--------|
| `RENDER_DEPLOY_HOOK_OS_API_STAGING` | SECRET | GitHub `staging` |
| `RENDER_DEPLOY_HOOK_OS_WEB_STAGING` | SECRET | GitHub `staging` |
| `RENDER_DEPLOY_HOOK_OS_API_PROD` | SECRET | GitHub `production` |
| `RENDER_DEPLOY_HOOK_OS_WEB_PROD` | SECRET | GitHub `production` |
| `R2_BACKUP_*` / AWS-compatible keys | PROVIDER_SECRET | GitHub + backup cron (not os-web) |
| `BETTERSTACK` / uptime | MONITORING | Better Stack UI only |

### Currently unused by OS (do not set on Render OS services)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | **Legacy** `packages/database` / `apps/api`. os-api **fail-closed** if this is used instead of `OS_DATABASE_URL`. |
| `REDIS_URL` | Legacy demo. Not OS. |
| `ALLOW_MOCK_PROVIDERS` | Legacy `apps/api` provider registry. **Do not set** on OS production. |
| `MESSAGING_PROVIDER`, `MAPS_PROVIDER`, `AI_PROVIDER`, `STORAGE_PROVIDER`, `SEARCH_PROVIDER`, `PDF_PROVIDER`, `EMAIL_PROVIDER` | Legacy registry. OS does not boot this registry today. |
| `NEXT_PUBLIC_API_URL`, `API_PORT` | Legacy web/api. |
| `SEED_*` | Legacy demo seed. |

### Unsafe shared envs

- Architect `NEXT_PUBLIC_SUPABASE_*` reused on OS
- Same service role across staging/prod
- `OS_RUNTIME_PROFILE` omitted on Render (profile would infer **production** from `NODE_ENV` and skip staging semantics)
- Carmen XL `DATABASE_URL` in OS Render

### Must rename before prod

**None** for canonical OS names (`OS_DATABASE_URL` is already correct). Do not revive `DATABASE_URL` for OS.

**Required app vars (staging/prod minimum): 13**  
os-api: 7 required (`OS_RUNTIME_PROFILE`, `OS_AUTH_MODE`, `OS_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OS_API_PORT`/`PORT`)  
os-web: 4 required (`NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)  
Plus `NODE_ENV` implied by host.

**Planned additions before public staging:** Sentry DSNs, optional migrate URL, CI Postgres + staging deploy workflow. (`OS_CORS_ORIGINS` + host `PORT` already in repo.)

---

# 6. GitHub Environments

Create two GitHub Environments on the **ISALWA-owned** repository:

### `staging`

| Field | Value |
|-------|--------|
| **Name** | `staging` |
| **URL** | `https://app.staging.<ISALWA_DOMAIN>` |
| **Required reviewers** | Optional (0 or 1). Auto after CI on `main` is acceptable. |
| **Wait timer** | 0 |
| **Deployment branches** | `main` only |
| **Secrets** | Staging DB URLs, staging Supabase, staging Render deploy hooks, staging Sentry, backup keys for staging bucket |
| **Vars** | Public hostnames, `OS_RUNTIME_PROFILE=staging` |

### `production`

| Field | Value |
|-------|--------|
| **Name** | `production` |
| **URL** | `https://app.<ISALWA_DOMAIN>` |
| **Required reviewers** | **At least 1**, preferably **2** ISALWA-named approvers (ISALWA DECISION: who) |
| **Wait timer** | 0 unless ISALWA wants a bake time |
| **Deployment branches** | **Tags `v*`** and/or `workflow_dispatch` on `main` — **not** every push to `main` |
| **Prevent self-review** | On if two engineers exist |
| **Secrets** | Production-only; never staging copies |

Production **must not** auto-deploy from feature branches or from `main` without the production workflow + approval.

**Who may approve production:** two people listed in `PRODUCTION_ACCESS_REGISTER` (to be created). Not “whoever has Carmen’s laptop.”

---

# 7. CI/CD

**Keep GitHub Actions.** Current workflow (`.github/workflows/ci.yml`) is **install + build + typecheck only** — insufficient for the gates below.

### Workflow A — `ci.yml` (PR + `main`)

**On:** pull_request; push to `main`

| Step | Command / action |
|------|------------------|
| Checkout | `actions/checkout@v4` |
| pnpm + Node 22 | existing setup |
| Install | `pnpm install --frozen-lockfile` |
| Build | `pnpm build` (or OS filters + packages) |
| Typecheck | `pnpm typecheck` |
| Unit | `pnpm --filter @isalwa/os-api test` (and os-web unit) **without** requiring live staging |
| Integration | Service container `postgis/postgis:16-3.4`; `OS_DATABASE_URL=...`; `pnpm --filter @isalwa/os-database migrate:deploy`; `pnpm --filter @isalwa/os-database test`; `pnpm --filter @isalwa/os-api test` |
| Preflight (matrix) | `OS_RUNTIME_PROFILE=staging` dummy-safe validation **without** real secrets printed (`os-production-preflight.sh` with placeholder URLs that pass format checks **or** skip network ping in CI) |

PRs never migrate staging/prod.

### Workflow B — `deploy-staging.yml`

**On:** push to `main` after CI success (`workflow_run` or job `needs`)

1. Re-run quality gates (or trust `ci.yml` via `workflow_run` types: completed success).  
2. GitHub Environment `staging`.  
3. `prisma migrate deploy` with staging **direct** `OS_DATABASE_URL`.  
4. POST Render deploy hooks: `os-api-staging`, then `os-web-staging`.  
5. Smoke: `GET https://api.staging.<ISALWA_DOMAIN>/v1/health` and `/v1/health/ready`; `GET https://app.staging.<ISALWA_DOMAIN>/login`.

### Workflow C — `deploy-production.yml`

**On:** `workflow_dispatch` (choose git SHA or tag) **or** push of tag `v*`

1. Environment `production` → **required reviewers**.  
2. Preflight with production env (no secret echo).  
3. **Backup/snapshot** (provider snapshot + `pg_dump` to R2) and wait for success.  
4. `prisma migrate deploy` with production **direct** URL.  
5. Deploy hooks: `os-api-prod`, `os-web-prod`.  
6. Health + ready + login page.  
7. On failure: Render rollback **application**; DB **forward-fix or restore** — never `migrate down`.

**Never:** `prisma migrate dev`, `prisma db push`, or migrate using a transaction pooler URL.

---

# 8. Migration safety

### PRE-MIGRATION

1. Confirm target (`staging` vs `production`) and git SHA.  
2. **Backup:** provider snapshot + off-host dump (production **required**; staging required before destructive SQL).  
3. Record `_prisma_migrations` (or `prisma migrate status`).  
4. **Preview:** read new files under `packages/os-database/prisma/migrations/` — reject unreviewed `DROP` / `TRUNCATE` / narrowing.  
5. Runtime compatibility: expand/contract — old app must run if migrate is backward-compatible; otherwise **migrate and deploy same window**.  
6. Preflight: `./scripts/os-production-preflight.sh`.

### MIGRATION

```bash
export OS_DATABASE_URL="<direct postgres URL>"
pnpm --filter @isalwa/os-database migrate:deploy
```

Use GitHub Environment secrets. Direct URL only.

### POST-MIGRATION

1. `GET /v1/health` → 200  
2. `GET /v1/health/ready` → 200, `authMode: supabase`, `devBootstrapEnabled: false`  
3. Login smoke + one authenticated query (e.g. attention or parties)  
4. Outbox: pending not monotonically increasing while idle  

### Rollback / forward-fix

| Situation | Action |
|-----------|--------|
| Bad **app** deploy, DB unchanged | Render rollback |
| Bad **migration** applied | **No automatic down migration.** Forward-fix PR or restore from pre-migration backup onto a **new** DB / PITR, then point `OS_DATABASE_URL` |
| Unsure | Stop deploys; use INCIDENT_RUNBOOK |

---

# 9. Backup / restore

Backups are **not** production-ready until a restore has succeeded on an isolated database.

| Layer | Staging | Production |
|-------|---------|------------|
| **PRIMARY** | Render automated snapshots | Render/RDS **PITR** + snapshots |
| **SECONDARY** | Encrypted `pg_dump -Fc` → R2 `isalwa-os-backups-staging/` | Encrypted dump → R2 `isalwa-os-backups-prod/` |
| **Frequency** | Daily dump + snapshots | Daily dump; PITR continuous; extra dump pre-migrate |
| **Retention** | 14 days dumps | 30 days daily dumps + pre-migrate kept until verified; monthly longer per ISALWA policy |
| **Encryption** | Provider at-rest + `gpg` or SSE on R2 | Same |
| **Off-host credentials** | GitHub `staging` + Render cron **or** GitHub scheduled workflow | GitHub `production` + scheduled workflow |
| **Access role** | ISALWA ops admin (two people) — not a personal AWS/Render login | Same |
| **Restore location** | Isolated Render Postgres `isalwa-os-restore-drill` (ephemeral) | Same class of isolated instance — **never** restore onto live prod in-place as first test |
| **Cadence** | Restore drill at first staging go-live, then **quarterly** | Quarterly + after backup-system changes |

Procedure: existing [`docs/operations/BACKUP_RESTORE_RUNBOOK.md`](../operations/BACKUP_RESTORE_RUNBOOK.md) (`pg_dump` / `pg_restore` / `verify-step-17-backup-restore.sh` locally). **Update** that runbook with PITR + R2 paths when implementing (do not duplicate a second backup bible).

R2 here is **backup storage only**. Application document buckets stay **LATER** (provider review).

---

# 10. Observability

Do **not** add Prometheus/Grafana.

| Signal | Plan | Notes |
|--------|------|--------|
| **Errors os-web** | Sentry browser SDK, env `staging` / `production` | PII scrub: NIT, tokens, message bodies |
| **Errors os-api** | Sentry Node SDK | Same scrubbing |
| **Logs** | Render log stream; JSON lines | Today: startup JSON + outbox JSON `console.*`. **GAP:** no pino, no request id middleware. Add `x-request-id` (generate if missing) in a small os-api middleware **before OBSERVABILITY_READY**. Full pino is optional if JSON console + request id is consistent. |
| **Uptime** | Better Stack (or UptimeRobot) | Checks: staging/prod `/v1/health`, `/v1/health/ready`, `/login` |
| **Outbox backlog** | `GET /v1/health/ready` includes `outboxWorker.pending`; admin `GET /v1/operations/outbox` | Alert if pending grows for N minutes while worker `running` |
| **Alerts** | Email + WhatsApp/SMS **to ISALWA ops**, not Carmen-personal-only | ISALWA DECISION: destination |
| **Session replay** | **Off** | Privacy; Bolivia customer data |

Sentry projects: `isalwa-os-web` and `isalwa-os-api` (or one project with `distinct` tags). Separate DSNs per environment preferred.

---

# 11. DNS / TLS

**ISALWA DECISION:** company domain (`<ISALWA_DOMAIN>`). Do not use Carmen-owned, Render `onrender.com` as the **production** customer hostname (onrender.com is acceptable only as a **temporary staging probe** before DNS exists).

### Recommended hostnames (placeholders)

| Env | Web | API |
|-----|-----|-----|
| Staging | `app.staging.<ISALWA_DOMAIN>` | `api.staging.<ISALWA_DOMAIN>` |
| Production | `app.<ISALWA_DOMAIN>` | `api.<ISALWA_DOMAIN>` |

| Concern | Plan |
|---------|------|
| **DNS** | Cloudflare on **ISALWA-owned** zone |
| **TLS** | Cloudflare proxy **or** Render-managed certs on those hostnames — HTTPS only |
| **Redirects** | HTTP → HTTPS |
| **Supabase callbacks** | Exactly the web origins above |
| **CORS** | os-api allowlist = web origin of **that** env only (**GAP** today) |
| **Cookies** | Host-only on web hostname; `Secure` in production/staging (`NODE_ENV=production`); `SameSite=Lax`. Staging and prod must not share a cookie domain like parent `.isalwa.bo` unless explicitly designed (prefer **not** to). |
| **os-web → os-api** | Server-side fetch to `NEXT_PUBLIC_OS_API_URL` (already the pattern) |

---

# 12. Security pre-flight

| Check | Expected | Status now |
|-------|----------|------------|
| No DEV auth on staging/prod | `OS_AUTH_MODE=supabase` + profile ≠ development; env validation fail-closed | **ALREADY IN REPO** if env is set |
| No fake tenant headers | Dev headers ignored unless development+dev | **ALREADY IN REPO** |
| No mock providers | OS does not boot `createProviderRegistry`; do not set `ALLOW_MOCK_PROVIDERS` | **PASS for OS** (legacy app still has mocks — do not deploy `apps/api` as OS) |
| No debug routes | `/v1/dev/*` unregistered when not development+dev | **ALREADY IN REPO** |
| No sample accounts on prod | Do not run demo/legacy seed against prod; staging may use synthetic bootstrap | **PROCESS** |
| No secrets in repo | `.env` gitignored | **ALREADY IN REPO** — verify in PR |
| CORS exact | Allowlist via `OS_CORS_ORIGINS` | **ALREADY IN REPO** |
| Rate limits | App-level | **GAP** — rely on Supabase Auth limits + Cloudflare; add API throttle before opening beyond a small employee set |
| Session cookie secure | `secure` when `NODE_ENV=production` | Dev cookie **ALREADY**; Supabase SSR cookies must be confirmed on live staging |
| DB not public | Render private | **PLANNED** |
| Service role server-only | Not on os-web | **ALREADY** if operators follow contract |
| PORT binding | Host `PORT` | **ALREADY IN REPO** |

**SECURITY PRE-FLIGHT:** remaining soft gaps (rate limit, request IDs, Sentry) — not a provider change. CORS + PORT + fail-closed auth are **in repo**.

---

# 13. Data safety

| Rule | Detail |
|------|--------|
| **Staging data** | Synthetic / anonymized only. Invite test users who are not production identities. |
| **No unsanitized prod copy** | Forbidden. If a copy is ever needed: dump → sanitize (PII, NIT, phones) → restore to staging. |
| **First real customer data** | Only after gates: `PRODUCTION_INFRA_READY` + `PRODUCTION_AUTH_READY` + `BACKUP_RESTORE_READY` + `OBSERVABILITY_READY` + `FIRST_REAL_DATA_READY`. |
| **Backup before real data** | Snapshot + off-host dump + **successful restore drill**. |
| **Architect / demo tenants** | Never mix `dataOrigin` demo into production org. |

---

# 14. Low-maintenance operations

Normal company operation must not require Carmen. Classify remaining tribal knowledge:

| Operation | How (target) | Classification |
|-----------|----------------|----------------|
| Deploy staging | Merge `main` + Actions + Render | **MUST_BE_ADMIN-OPERABLE** |
| Deploy production | GitHub approval + Actions | **MUST_BE_ADMIN-OPERABLE** |
| Rollback app | Render dashboard Rollback | **MUST_BE_ADMIN-OPERABLE** |
| Rotate secret | Render env + GitHub Environment + restart (SECRET_ROTATION_RUNBOOK) | **MUST_BE_ADMIN-OPERABLE** |
| See outage | Better Stack + Sentry + Render logs | **MUST_BE_ADMIN-OPERABLE** |
| View failed jobs | Admin API `GET /v1/operations/outbox` + dead-letter retry API | **MUST_BE_ADMIN-OPERABLE** via API today; **no os-web outbox UI** → document curl/runbook (**GAP** for non-engineer admin) |
| Restore DB | `pg_restore` + runbook | **ACCEPTABLE_SETUP_ONLY** for rare DR (CLI is OK); quarterly drill is an admin calendar item |
| Add user | Admin UI Invite (workforce) | **MUST_BE_ADMIN-OPERABLE** |
| Suspend user | Admin UI | **MUST_BE_ADMIN-OPERABLE** |
| Re-run provider sync | `RetryAuthProviderSync` **API exists; not wired in UI-2B** | **GAP** — MUST_BE_ADMIN-OPERABLE via documented API until UI ships |
| Diagnose auth | Sentry + Supabase Auth logs + `os_auth_identities` mapping | Mix: dashboards **MUST_BE_ADMIN-OPERABLE**; SQL **ACCEPTABLE_SETUP_ONLY** |
| Verify backup | Restore drill script / runbook | **ACCEPTABLE_SETUP_ONLY** (quarterly CLI) |

SSH to Carmen XL: **not** an ops path for staging/prod.

---

# 15. Cost plan

Rough **monthly staging + production**, excluding WhatsApp/AI. **LOW** overall.

| Item | Staging | Production | Band |
|------|---------|------------|------|
| Render compute (web+api) | ~USD 14–50 (Starter/Standard) | ~USD 25–50 | LOW |
| Postgres 16 + backups | ~USD 7–20 | ~USD 20–50 (PITR plan) | LOW |
| Supabase Auth (2 projects) | USD 0–25 | USD 0–25 | VERY LOW / LOW |
| Sentry | shared Team or free | included | VERY LOW / LOW |
| Uptime (Better Stack) | free tier | free tier | FREE / VERY LOW |
| R2 backup storage | ~USD 0–5 | ~USD 0–5 | VERY LOW |
| DNS (Cloudflare) | free | free | FREE |
| **Combined** | | | **~USD 80–200/mo** |

---

# 16. Provider ownership

Every production-related account: **ISALWA-owned**. Not Carmen personal, not a developer personal, not a temporary demo.

| Provider | Required model | Min admin redundancy |
|----------|----------------|----------------------|
| **GitHub** | Organization `ISALWA` (or client legal name). Transfer `carmen-ship-it/ISALWA-DEMO` **or** mirror to ISALWA org. | 2 owners |
| **Render** | Team on ISALWA email / org billing | 2 admins |
| **Supabase** | ISALWA org; projects `isalwa-os-auth-staging` and `isalwa-os-auth-prod` **plus** Architect remains separate | 2 owners |
| **Cloudflare** | ISALWA zone + R2 | 2 admins |
| **Sentry** | ISALWA org | 2 admins |
| **R2** | Same Cloudflare account, dedicated backup buckets | covered by Cloudflare |

Break-glass credentials live in a company password manager when adopted; until then, two humans must be able to reset via provider email.

---

# 17. Handoff documents

**Do not duplicate.** Update stale ops docs when implementing; create only the registers that do not exist.

| Document | Action |
|----------|--------|
| [`docs/operations/ENVIRONMENT_MAP.md`](../operations/ENVIRONMENT_MAP.md) | **UPDATE** — hosting no longer “TBD”; point at this plan; keep provider-neutral commands |
| [`docs/operations/DEPLOYMENT_RUNBOOK.md`](../operations/DEPLOYMENT_RUNBOOK.md) | **UPDATE** — add Render appendix (build/start/hooks) without replacing portable steps |
| [`docs/operations/BACKUP_RESTORE_RUNBOOK.md`](../operations/BACKUP_RESTORE_RUNBOOK.md) | **UPDATE** — PITR + R2 off-host + cadence |
| [`docs/operations/SECRET_ROTATION_RUNBOOK.md`](../operations/SECRET_ROTATION_RUNBOOK.md) | **UPDATE** — GitHub Environments + Render restart |
| [`docs/operations/INCIDENT_RUNBOOK.md`](../operations/INCIDENT_RUNBOOK.md) | **UPDATE** — Render rollback, Sentry, Better Stack; remove “use `/v1/dev/status`” as a prod first step |
| [`docs/operations/README.md`](../operations/README.md) | **UPDATE** — selected topology planned, not “no provider selected” |
| `docs/operations/PRODUCTION_ACCESS_REGISTER.md` | **CREATE** (names/roles/emails — no secrets) |
| `docs/operations/PROVIDER_OWNERSHIP_REGISTER.md` | **CREATE** (account IDs, billing owner, 2 admins — no secrets) |
| [`MAINTENANCE_RUNBOOK.md`](../operations/MAINTENANCE_RUNBOOK.md) | Keep; still valid |

This implementation plan is the **staging/prod topology** source until those updates land.

---

# 18. Gates

Evidence must be artifacts (URLs, logs, dump keys, screenshots of dashboards) stored outside git secrets. Status labels must not jump to PRODUCTION-VERIFIED without that evidence.

### STAGING_READY

- ISALWA-owned Render: `os-web-staging`, `os-api-staging`, Postgres staging  
- Isolated `isalwa-os-auth-staging`  
- `OS_RUNTIME_PROFILE=staging`, `OS_AUTH_MODE=supabase`, `/v1/dev/*` absent  
- `GET /v1/health` and `/v1/health/ready` 200  
- Login with a **synthetic** invited user mapped to OS `AuthIdentity`  
- CORS allowlist in place (or staging still private + GAP ticket closed)  
- GitHub Environment `staging` + CI green including Postgres tests  

### PRODUCTION_INFRA_READY

- ISALWA-owned prod Render services exist, auto-deploy **off**  
- Isolated prod Postgres, not public, PostGIS available  
- DNS/TLS on company domain **or** documented exception that prod hostname is not Carmen-owned  
- GitHub Environment `production` with required reviewers  

### PRODUCTION_AUTH_READY

- Isolated `isalwa-os-auth-prod`  
- Callbacks only prod web origin  
- Service role only on `os-api-prod`  
- Invite → login → API membership check works  
- Suspend revokes session (staging already contracted; **prove on staging**, then prod config parity)  

### BACKUP_RESTORE_READY

- PITR or snapshots **and** encrypted off-host dump  
- Restore onto isolated DB succeeded; row-count/marker verification  
- Cadence on calendar (quarterly)  
- **Do not** mark ready after snapshots alone  

### OBSERVABILITY_READY

- Sentry events from os-web and os-api in staging  
- Better Stack green on health/ready/login  
- Request id in API error logs  
- Alert destination ≠ Carmen-only  

### FIRST_REAL_DATA_READY

- All above except UAT  
- Restore proof  
- No unsanitized prod copy process  
- Written ISALWA approval to load real parties  

### PRODUCTION_UAT_READY

- Production infra + auth + backups + observability  
- Employee UAT on production hostname with **real process**, still capability-honest (no fake WhatsApp/AI)  
- Rollback path demonstrated once on staging  

---

# 19. Do not implement in this infra program

Clerk, WorkOS, Redis, BullMQ, SQS, WhatsApp, AI providers, Meilisearch, product analytics, OCR, accounting vendor, payments, R2 **application** document buckets (backup R2 **is** in this plan), Resend (Supabase Auth mail is enough until OS sends quotes).

---

# Implementation sequence (when execution is authorized)

0. **ISALWA ownership + domain + two prod approvers** (blocker).  
1. GitHub org/environments; expand CI with Postgres tests (no deploy).  
2. **First slice:** staging Render + staging Postgres + staging OS Auth + synthetic login.  
3. CORS + PORT binding + Sentry + uptime.  
4. Backup dump to R2 + restore drill.  
5. Production accounts/services (empty DB) + production workflow with approval.  
6. Production UAT; then first real data gate.

---

# Carmen handoff (reconciled 2026-09-02)

### CURRENT PRODUCT STAGE

**First human internal UAT (DEV) + production/staging infrastructure planning.** Feature lanes for Workforce Admin mutations and Commercial Phase 1 are closed enough for business UAT. Infrastructure is **PLANNED**, not deployed.

### WORKFORCE ADMIN

**CONDITIONAL / SAFE FOR HUMAN DEV UAT** — ChangeDepartment/Role/Manager, Suspend, Activate (from suspended), Terminate (+ open-work block), Grant/RevokeDelegation verified in browser (UI-LIVE-3/3B). Invite/Rehire/ChangeMemberEmail **blocked**. RequestMemberEmailChange + Supabase browser auth **unverified**.

### COMMERCIAL

**READY for human internal UAT** — Clientes, Cliente 360, Opp/Quote path, Historial. CreateOrder UI **absent** (G-02). Commercial Approval **absent** (G-08). Null-freshness defect **CLOSED**.

### G-02

**DECISION PENDING** — brief independently PASSED; ISALWA must choose A/B/C. No implementation started.

### HUMAN UAT

**READY** — package at `docs/uat/FIRST_HUMAN_INTERNAL_UAT_GUIDE.md` (DEV auth / localhost). Not production UAT.

### PRODUCTION PROVIDER REVIEW

**ACCEPTED** — no IdP swap; Supabase Auth for credentials/sessions only; OS owns identity/authz; Render + managed Postgres; outbox stays in os-api.

### RECOMMENDED STAGING TOPOLOGY

Render `os-web-staging` + `os-api-staging` (outbox **inside** API) + Render Postgres `isalwa-os-staging` + Supabase `isalwa-os-auth-staging` + GitHub Environment `staging` + `app.staging.<ISALWA_DOMAIN>` / `api.staging.<ISALWA_DOMAIN>` + **synthetic data only**.

### RECOMMENDED PRODUCTION TOPOLOGY

Render `os-web-prod` + `os-api-prod` (outbox **inside** API, auto-deploy **off**) + Render Postgres `isalwa-os-prod` (PITR) + Supabase `isalwa-os-auth-prod` + GitHub Environment `production` (required reviewers) + `app.<ISALWA_DOMAIN>` / `api.<ISALWA_DOMAIN>`.

### RENDER SERVICES

1. `os-api-staging`  
2. `os-web-staging`  
3. `os-api-prod`  
4. `os-web-prod`  

Plus two Postgres instances. **No separate worker service.**

### DATABASES

- DEV: local PostGIS docker (or non-prod tunnel)  
- `isalwa-os-staging`  
- `isalwa-os-prod`  
- Ephemeral `isalwa-os-restore-drill` for restore tests  

### AUTH PROJECT BOUNDARIES

- Architect Supabase: **separate, unused by OS**  
- `isalwa-os-auth-staging` — OS staging only  
- `isalwa-os-auth-prod` — OS production only  
- Supabase = credentials/MFA/sessions/invite mechanics; OS = Person/Member/AuthIdentity/roles/access  

### CI/CD PLAN

PR: install, build, typecheck, unit, Postgres integration. `main`: staging migrate + deploy hooks + smoke. Production: human approval → preflight → backup → `migrate deploy` → deploy → health/ready → app rollback ≠ migrate down.

### BACKUP PLAN

Provider snapshots/PITR **plus** encrypted off-host `pg_dump` to ISALWA R2; restore drill **before** real data; quarterly thereafter.

### MONITORING PLAN

Sentry (web+api) + Render structured logs + request ids + Better Stack on `/v1/health`, `/v1/health/ready`, `/login`. No Grafana.

### REQUIRED ACCOUNT OWNERSHIP

ISALWA-owned (not Carmen personal): GitHub org, Render, managed Postgres billing, OS Supabase projects, Cloudflare (DNS + future R2), Sentry — **two admins each**.

### WHAT MUST EXIST BEFORE REAL DATA

ISALWA-owned staging+prod isolation; prod OS Auth project; PITR + off-host dump; **successful restore drill**; Sentry+uptime; CORS allowlist; no DEV auth routes; production approval workflow; written go-ahead.

### WHAT MUST NOT BE BUILT YET

Clerk, WorkOS, Redis, BullMQ, SQS, WhatsApp, AI, Meilisearch, OCR, accounting, payments, product analytics, CreateOrder UI (until G-02), Commercial Approval (until G-08), app document R2 (backup R2 is in-plan).

### ARCHITECTURE CHANGES REQUIRED

**NONE** to domain, outbox, or AuthProviderPort.  
**SMALL (at first staging slice):** CI expansion; Sentry; request id; first-admin Supabase bootstrap script; `render.yaml` / os-web deploy config. (**Done already:** host `PORT`, `OS_CORS_ORIGINS` fail-closed.)

### LOW-MAINTENANCE HANDOFF

**CONDITIONAL** — plan exists; ownership and staging not yet executed.

### CARMEN-DISAPPEARANCE TEST

**FAIL today** (personal/pilot hosting). **CONDITIONAL** after ISALWA-owned staging+two admins. **PASS** after two admins can deploy, restore, invite/suspend without Carmen.

### FIRST SAFE IMPLEMENTATION SLICE

**Staging only:** ISALWA-owned Render `os-web-staging` + `os-api-staging` + isolated staging Postgres + isolated `isalwa-os-auth-staging`, synthetic users — no production services, no apex DNS cutover, no real customer data.

### EXACT NEXT ACTION

**Run first human internal UAT on DEV** (`docs/uat/FIRST_HUMAN_INTERNAL_UAT_GUIDE.md`) **while establishing ISALWA ownership of GitHub/Render/Supabase/domain and naming two production approvers** — no production workloads yet.

### EXACT NEXT CURSOR PROMPT

```
ISALWA OS — execute FIRST STAGING SLICE only.

Read docs/architecture/PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md and
docs/architecture/PRODUCTION_PROVIDER_ARCHITECTURE_REVIEW.md.

Constraints:
- No production Render services
- No production Supabase project
- No real customer data
- No DNS cutover on the company apex
- No Clerk / WorkOS / Redis / WhatsApp / AI / Resend / app-document R2
- Do not use Carmen-personal accounts as the owning org; stop if ISALWA-owned GitHub/Render/Supabase are not available
- Architect app stays untouched
- Do not reopen Workforce/Commercial closed defects
- Do not implement G-02 or G-08

Implement:
1. Honor Render PORT in os-api and os-web start
2. CORS allowlist from OS_CORS_ORIGINS (fail closed on staging/production)
3. GitHub Actions: PR Postgres integration tests; staging deploy workflow skeleton (no secrets in repo)
4. Docs: ENVIRONMENT_MAP + DEPLOYMENT_RUNBOOK Render appendix for staging only

Do not create cloud accounts yourself. Produce exact operator checklists for Render/Supabase/GitHub Environment `staging` instead if credentials are absent.

STOP after staging-slice code/docs; no production workflow live-deploy.
```

STOP.
