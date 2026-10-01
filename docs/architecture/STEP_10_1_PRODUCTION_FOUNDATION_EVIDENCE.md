# Step 10.1 — Production Foundation Evidence

**Phase:** Step 10.1 — Production foundation closure  
**Date:** 2026-08-23  
**Prior gate:** Step 10 CONDITIONAL PASS  
**This gate:** **CONDITIONAL PASS**

---

## Evidence delta (pre-implementation audit)

| Area | Before Step 10.1 | After Step 10.1 |
|------|------------------|-----------------|
| Store contract | `WorkforceCommandService` bound to `MemoryOsStore` arrays | `OsWorkforceStore` interface; single command service |
| Persistence | Memory only at runtime | `PrismaOsWorkforceStore` when `OS_DATABASE_URL` set |
| Prisma schema | `os_*` tables defined + migration file | Same — no schema drift |
| API wiring | Always `MemoryOsStore` | Prisma store in production path; memory fallback in dev without URL |
| Session | Dev headers only; trusted client member ids | Dev headers **validated** against store; `OS_AUTH_MODE=supabase` resolves JWT → AuthIdentity → Member |
| Auth provider | `LocalAuthProviderPort` only | + `SupabaseAuthProviderPort` (invite/revoke/email via service role) |
| Tests | Memory only (19 tests) | Memory 19 pass + Prisma integration suite (5 cases, requires live Postgres) |
| Legacy | Frozen | Still frozen (`packages/database` untouched) |

**Architecture contract:** No changes to Step 9 contracts, event names, or command set.

---

## Verification tiers (do not collapse)

| Tier | Meaning | Step 10.1 status |
|------|---------|------------------|
| MEMORY VERIFIED | Tests pass against `MemoryOsStore` | **YES** — 19 tests pass |
| PRISMA VERIFIED | Migration + lifecycle against live Postgres | **PENDING LOCAL** — code + tests exist; agent runtime had no Postgres/docker |
| RUNTIME VERIFIED | `os-api` HTTP against persistence | **PENDING LOCAL** — requires Postgres + `OS_DATABASE_URL` |
| PRODUCTION AUTH VERIFIED | Supabase JWT session end-to-end | **REQUIRES_DECISION** — resolver implemented; needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, active `supabase` AuthIdentity rows |

---

## Implementation map

| Component | Location |
|-----------|----------|
| Store interface | `packages/os-workforce/src/os-workforce-store.ts` |
| Memory implementation | `packages/os-workforce/src/memory-store.ts` |
| Prisma implementation | `packages/os-database/src/prisma-workforce-store.ts` |
| Command service (unchanged logic) | `packages/os-workforce/src/workforce-command-service.ts` |
| Local auth port | `packages/os-workforce/src/auth-provider.ts` |
| Supabase auth port | `packages/os-workforce/src/supabase-auth-provider.ts` |
| Session resolver | `apps/os-api/src/os-session.ts` |
| API store wiring | `apps/os-api/src/os-store.module.ts` |
| Prisma schema + migration | `packages/os-database/prisma/` |

---

## Store contract coverage

| Entity / behavior | Memory | Prisma |
|-------------------|--------|--------|
| Person | ✓ | ✓ |
| OrganizationMember | ✓ | ✓ |
| AuthIdentity | ✓ | ✓ |
| RoleAssignment (effective-dated) | ✓ | ✓ |
| DepartmentAssignment | ✓ | ✓ |
| ManagerAssignment | ✓ | ✓ |
| Delegation | ✓ | ✓ |
| BusinessEvent + outbox + audit (transaction) | ✓ | ✓ `$transaction` |
| Idempotency keys | ✓ | ✓ |
| Tenant isolation in commands | ✓ | ✓ (integration test) |

---

## Session / auth boundary

### Dev mode (`OS_AUTH_MODE=dev` default)

- Headers: `x-os-organization-id`, `x-os-member-id`, `x-os-person-id`, `x-os-auth-identity-id`
- **Validated:** member must exist in org; person and auth identity must match member
- Client-supplied ids that disagree with store → `TENANT_FORBIDDEN`

### Supabase mode (`OS_AUTH_MODE=supabase`)

- `Authorization: Bearer <jwt>` required
- JWT verified via `supabase.auth.getUser`
- Maps `providerSubject` → `AuthIdentity` (`provider=supabase`)
- Derives `OrganizationMember` from DB — **does not trust client member/person/auth headers**
- Optional `x-os-organization-id` org hint validated against member membership

### Password / email (provider boundary)

| Operation | OS role | Provider role | Status |
|-----------|---------|---------------|--------|
| Password change | None — no hash storage | Supabase Auth | **DEFERRED** (provider UI/API) |
| Password reset | None | Supabase Auth | **DEFERRED** |
| Email change | `RequestMemberEmailChange` / `ChangeMemberEmail` + audit | `SupabaseAuthProviderPort.updateEmail` when configured | **INTEGRATED** (port); live verify needs service role |
| Disable / terminate | Revoke member + `revokeCredentials` | Provider revoke/delete user | **TESTED** (local port) |
| Rehire | New member row, same Person | New invite at provider | **TESTED** |

---

## Test evidence

### Memory (2026-08-23)

```bash
cd /Users/carmen/projects/isalwa
npx pnpm@9.15.4 --filter @isalwa/os-domain --filter @isalwa/os-workforce --filter @isalwa/os-api test
```

| Suite | Pass | Fail |
|-------|------|------|
| os-domain | 6 | 0 |
| os-workforce (memory) | 11 | 0 |
| os-api (memory fallback) | 2 | 0 |

### Prisma integration (requires live Postgres)

```bash
docker compose -f docker/docker-compose.yml up -d postgres
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
npx pnpm@9.15.4 --filter @isalwa/os-database migrate:deploy
npx pnpm@9.15.4 --filter @isalwa/os-database test
```

Cases: invite/activate + events, tenant isolation, full lifecycle, idempotency, terminated blocked.

**Agent run:** Postgres unreachable at `localhost:5432` — integration tests skip when DB unavailable.

---

## Runtime verification (Postgres path)

```bash
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
export OS_AUTH_MODE=dev
npx pnpm@9.15.4 --filter @isalwa/os-database migrate:deploy
npx pnpm@9.15.4 --filter @isalwa/os-api build
node apps/os-api/dist/main.js   # :4001 — uses Prisma when URL set

curl -s http://127.0.0.1:4001/v1/dev/status
# expect: {"mode":"dev","persistence":"prisma"}

curl -s -X POST http://127.0.0.1:4001/v1/dev/bootstrap
# use returned IDs + InviteMember as in Step 10 evidence
```

Restart server and bootstrap again — data must persist across restart (Prisma path).

---

## Supabase production auth verification

```bash
export OS_AUTH_MODE=supabase
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
export SUPABASE_SERVICE_ROLE_KEY=...   # for invite/revoke/email admin ops
export OS_DATABASE_URL=...

# Seed AuthIdentity with provider=supabase, providerSubject=<supabase user id>, status=active
# curl with Bearer <user jwt> — session derived from DB, not headers
```

**Status:** REQUIRES_DECISION — use existing Architect Supabase project or dedicated OS tenant project.

---

## Final gate checklist

| Item | Status |
|------|--------|
| Prisma store works | IMPLEMENTED — pending PRISMA_VERIFIED on Carmen machine |
| Migration applies | Migration file ready — pending `migrate:deploy` on live Postgres |
| Lifecycle persists | Integration test written |
| Tenant isolation vs Postgres | Integration test written |
| Authorization vs Postgres | Via same command service |
| Terminate/rehire history | Integration test |
| Delegation persists | Integration test |
| BusinessEvent/audit persistence | Integration test counts |
| No ActivityEvent authority | Confirmed |
| Legacy schema frozen | Confirmed |
| Auth integrated or blocked on decision | Supabase resolver + port; **CONDITIONAL** |
| No silent architecture drift | Confirmed |
| Evidence register updated | Yes |

---

## Open gaps

| ID | Gap | Classification |
|----|-----|----------------|
| GAP-10.1-01 | PRISMA_VERIFIED not run in CI/agent | OPS — run migration + integration tests locally |
| GAP-10.1-02 | Supabase OS AuthIdentity seeding for production JWT | REQUIRES_DECISION |
| GAP-10.1-03 | Multi-org member picker when one person has multiple active orgs | REQUIRES_DECISION |
| GAP-10.1-04 | `delegation.expired` scheduler | Lane D — Step 11 |

---

## Next gate

**Full Step 10 PASS** after Carmen runs Postgres verification commands above and confirms PRISMA_VERIFIED + RUNTIME_VERIFIED.

Then: **Lane D** (outbox worker) may start; **Lane B/C/E/F** per handoff manifest — not PartyGraph/Commercial until Step 10 fully PASS.

---

## Step 10.5 — Hosting / Vercel dependency audit (2026-08-23)

**Scope:** `packages/os-*`, `apps/os-api`, and future `apps/os-web` boundary (app does not exist yet).  
**Method:** Repository grep for `vercel`, `@vercel`, `VERCEL_*`, edge/serverless-only patterns; inspect build/deploy scripts, env vars, runtime entrypoints, and auth/storage coupling.  
**Gate:** **PASS** — OS foundation is deployment-provider neutral. No accidental Vercel coupling in Step 10/10.1 code.

**Position:** Vercel may be used temporarily for dev/staging elsewhere (Architect). Production hosting is **not selected**. This audit does not choose a host.

### Summary matrix

| Hosting dependency | Evidence | Risk | Classification | Required action | Gate |
|--------------------|----------|------|----------------|-----------------|------|
| **No Vercel SDK/imports in OS packages** | Grep across `packages/os-*`, `apps/os-api/src` — zero matches for `vercel`, `@vercel`, `VERCEL_` | None | **REUSABLE / PROVIDER-NEUTRAL** | None | PASS |
| **No `vercel.json` for OS API** | Only `apps/architect/vercel.json` exists; no `apps/os-api/vercel.json` | None | **REUSABLE / PROVIDER-NEUTRAL** | None | PASS |
| **NestJS + Express long-running process** | `apps/os-api/src/main.ts` — `app.listen(port, host)` on `0.0.0.0` | Low — not compatible with naive Vercel serverless without rewrite | **REUSABLE / PROVIDER-NEUTRAL** | When hosting is chosen, deploy as container/VM/Node service (Docker, ECS, Railway, VPS, etc.) — not as accidental serverless | PASS |
| **Build = `tsc` + `node dist/main.js`** | `apps/os-api/package.json` scripts | None | **REUSABLE / PROVIDER-NEUTRAL** | None | PASS |
| **Env vars (`OS_*`)** | `OS_DATABASE_URL`, `OS_API_PORT`, `OS_API_HOST`, `OS_AUTH_MODE` — generic | None | **REUSABLE / PROVIDER-NEUTRAL** | None | PASS |
| **Postgres via `OS_DATABASE_URL`** | `packages/os-database/prisma/schema.prisma`; `docker/docker-compose.yml` for local Postgres | Low — any host must reach Postgres (managed or self-hosted) | **REUSABLE / PROVIDER-NEUTRAL** | Provision Postgres at chosen host; not tied to Vercel | PASS |
| **Prisma Node client (not edge)** | `packages/os-database/src/client.ts` imports `./generated/client` (Node query engine) | Low — serverless/edge deploys need pooling adapter (any provider) | **REUSABLE / PROVIDER-NEUTRAL** | Do not switch to `@prisma/client/edge` unless deliberately targeting edge; current choice is portable | PASS |
| **Prisma generated edge artifacts** | `src/generated/client/edge.js` etc. exist as Prisma defaults but **not imported** by OS code | None if unused | **UNKNOWN / HARMLESS** | No action — dead artifacts in generated output | PASS |
| **CORS `cors: true`** | `apps/os-api/src/main.ts` | Medium — production should tighten origins per deployment | **REUSABLE / PROVIDER-NEUTRAL** | Configure allowed origins when `apps/os-web` exists — use env-driven origin list, not Vercel-specific | PASS (document) |
| **Supabase Auth (session + credentials)** | `os-session.ts`, `SupabaseAuthProviderPort`, `@supabase/supabase-js` | Medium — external IdP SaaS; often co-located with Vercel in demos but **not Vercel-owned** | **REQUIRES ABSTRACTION** (already bounded) | `AuthProviderPort` + `OS_AUTH_MODE` already isolate provider; IdP choice is **REQUIRES_DECISION** (GAP-10.1-02), not hosting | PASS |
| **Local dev auth port** | `LocalAuthProviderPort` — no network | None | **REUSABLE / PROVIDER-NEUTRAL** | Dev only | PASS |
| **Memory store fallback** | `os-store.module.ts` when no `OS_DATABASE_URL` and not production | None | **REUSABLE / PROVIDER-NEUTRAL** | Production requires `OS_DATABASE_URL` (enforced) | PASS |
| **Dev bootstrap routes** | `/v1/dev/bootstrap`, `/v1/dev/status` | Low — must not be exposed in production without guard | **REUSABLE / PROVIDER-NEUTRAL** | Gate or remove dev routes in production deploy config (hosting choice) | PASS (document) |
| **No hard-coded production URLs** | No `vercel.app` or fixed API origins in `os-*` source | None | **REUSABLE / PROVIDER-NEUTRAL** | Future `apps/os-web` should use env `OS_API_URL` / similar | PASS |
| **No webhook/callback URLs** | No OS webhook handlers in Step 10 | None | **REUSABLE / PROVIDER-NEUTRAL** | None | PASS |
| **`apps/os-web` (future)** | Does not exist | None today | **REUSABLE / PROVIDER-NEUTRAL** | Build as command/query client to `os-api`; avoid Next.js/Vercel-only data paths per `UI_REBUILD_PRINCIPLES.md` | PASS (policy) |
| **Architect on Vercel** | `apps/architect/vercel.json`, cron route comments | None for OS spine | **LEGACY / ARCHITECT DEMO** | Frozen; not OS authority | PASS (isolated) |
| **Legacy commercial `apps/web` + `apps/api`** | Next.js demo + Nest API; no `os-*` imports observed | None for OS foundation | **LEGACY DEMO DEPENDENCY** | Frozen per ADR-0012; separate from OS deploy surface | PASS (isolated) |
| **Turbo monorepo scripts** | Root `turbo.json`, `pnpm` — no Vercel deploy hooks for `os-api` | None | **REUSABLE / PROVIDER-NEUTRAL** | None | PASS |

### Provider-neutral deployment shape (target)

```
ISALWA domain
  → apps/os-web (future — env-configured API base URL)
  → apps/os-api (NestJS Node process)
  → packages/os-workforce + os-domain + os-events (domain commands)
  → packages/os-database (Prisma → Postgres)
  → Auth provider (Supabase today via port; replaceable)
  → Integrations (future lanes — not Step 10)
```

**Replaceable without changing:** tenant model, identity separation, authorization, BusinessEvent spine, commands, `os_*` schema authority, or domain logic.

### What would create future migration risk (not found in OS code)

| Anti-pattern | Found in OS Step 10? |
|--------------|----------------------|
| `@vercel/*` packages | No |
| `VERCEL_URL` / `VERCEL_ENV` assumptions | No |
| Edge-only runtime (`export const runtime = 'edge'`) | No |
| Vercel Postgres/ KV / Blob as OS authority | No |
| Next.js middleware as OS session authority | No |
| Hard-coded `*.vercel.app` origins | No |
| Serverless-incompatible design forced into Vercel | No — long-running API is intentionally portable |

### Hosting audit gate

| Criterion | Result |
|-----------|--------|
| OS foundation deployable without Vercel | **YES** |
| No silent Vercel coupling introduced in Step 10.1 | **YES** |
| Abstractions sufficient for host swap | **YES** (store interface, auth port, env-driven config) |
| Action required before Step 11 | **No hosting migration** — only document CORS + dev route hardening at deploy time |

**Step 10.5 hosting audit:** **PASS** — does not block Step 10.1 CONDITIONAL PASS status.

---

## Step 10.2 — Real persistence + runtime verification (2026-08-23)

### Carmen local verification — PASS (2026-08-23T20:42Z)

**Environment:** Homebrew `postgresql@16` on macOS (ICU linkage fixed via `scripts/fix-brew-postgres-icu.sh`).

| Check | Result |
|-------|--------|
| Postgres | `localhost:5432` accepting connections |
| Migration | `20260823120000_os_foundation_step10` applied |
| Prisma integration tests | **5 pass / 0 fail** |
| Memory regression | **19 pass / 0 fail** (domain 6 + workforce 11 + api 2) |
| API lifecycle curls | Invite → Activate → GET member **OK** |
| Persistence survival | API restart → same member `accessStatus: active` **OK** |
| Idempotency | Same `commandId` on duplicate invite **OK** |
| Dev routes in production | `DEV_ROUTE_BLOCKED_OK` |
| Log | `.step10-2-evidence/verify-20260823T204206Z.log` |

**Command:**

```bash
export OS_DATABASE_URL=postgresql://isalwa:isalwa@localhost:5432/isalwa
./scripts/verify-step-10-2.sh
```

### Agent execution attempt (earlier 2026-08-23) — blocked

**Agent execution attempt:** Postgres was **not reachable** in the verification environment.

| Environmental check | Result |
|---------------------|--------|
| `docker` | Not installed / daemon unavailable |
| `localhost:5432` | Connection refused (`P1001`) |
| `brew install postgresql@16` | Failed (macOS 13 / brew lock / tier warning) |
| `supabase start` | Requires Docker — unavailable |
| Supabase MCP on `efolotcrdaqdixfiqbek` | Permission denied for `list_tables` |
| `OS_DATABASE_URL` in `.env` | Points to `localhost:5432` — no server running |

**Therefore:** PRISMA_VERIFIED, RUNTIME_VERIFIED, PERSISTENCE_SURVIVAL_VERIFIED, Postgres TENANT_ISOLATION_VERIFIED, Postgres IDEMPOTENCY_VERIFIED, and PRODUCTION_AUTH_VERIFIED were **not executed** in this session.

### Verification tier results (independent)

| Tier | Status | Evidence |
|------|--------|----------|
| MEMORY_VERIFIED | **PASS** | 19 pass / 0 fail — Carmen verify script step 4 (2026-08-23) |
| PRISMA_VERIFIED | **PASS** | `migrate:deploy` + 5 integration tests — Carmen verify script steps 2–3 |
| RUNTIME_VERIFIED | **PASS** | Prisma-backed `os-api` lifecycle curls — Carmen verify script steps 6–11 |
| PERSISTENCE_SURVIVAL_VERIFIED | **PASS** | API kill/restart + GET member — Carmen verify script steps 13–14 |
| TENANT_ISOLATION_VERIFIED (Postgres) | **PASS** | `workforce-prisma.integration.test.ts` tenant case |
| TENANT_ISOLATION_VERIFIED (memory) | **PASS** | 2 api tests + workforce tenant test (memory store) |
| IDEMPOTENCY_VERIFIED (Postgres) | **PASS** | Integration test + curl idempotency key — Carmen verify script |
| IDEMPOTENCY_VERIFIED (memory) | **IMPLEMENTED** | Idempotency in command service; memory path untested separately |
| PRODUCTION_AUTH_VERIFIED | **PASS** | Step 10.3 — JWT session + tenant isolation + terminated rejection. Log: `.step10-3-evidence/verify-20260824T120200Z.log` |
| DEV_ROUTE_SAFETY_VERIFIED | **PASS** | `BootstrapController` excluded when `NODE_ENV=production`; `DEV_ROUTE_BLOCKED_OK` in verify script |
| HOSTING_NEUTRALITY_VERIFIED | **PASS** | Step 10.5 audit |

### Requirement trace (contract → result)

| Requirement | Contract | Implementation | Command/test | Actual result | Status |
|-------------|----------|----------------|--------------|---------------|--------|
| os_* migration | Step 9 storage | `packages/os-database/prisma/migrations/` | `migrate:deploy` | Applied `20260823120000_os_foundation_step10` | **PASS** |
| Prisma lifecycle | Step 10 | `PrismaOsWorkforceStore` | `pnpm --filter @isalwa/os-database test` | 5 pass | **PASS** |
| API + Postgres | API contract | `apps/os-api` + Prisma store | curl lifecycle script | Invite/activate/GET OK | **PASS** |
| Persistence survival | Step 10.2 §3 | Prisma persistence | restart + GET member | Member survives restart | **PASS** |
| Cross-tenant (Postgres) | ADR-0003 | command service + store | prisma integration test | tenant isolation pass | **PASS** |
| Idempotency (Postgres) | Storage contract | `os_idempotency_keys` | integration + curl | Same commandId returned | **PASS** |
| Supabase JWT session | ADR-0010 | `sessionFromSupabaseJwt` | Bearer JWT curl | Not run — no seeded OS auth rows | BLOCKED |
| Dev routes in production | Step 10.2 §7 | `app.module.ts` excludes dev controllers | `NODE_ENV=production` curl | `DEV_ROUTE_BLOCKED_OK` | **PASS** |
| CORS | Deploy config | `cors: true` in `main.ts` | — | Permissive default; tighten at deploy | DOCUMENT |

### Carmen verification script (authoritative when Postgres available)

```bash
cd /Users/carmen/projects/isalwa
./scripts/verify-step-10-2.sh
```

**Successful evidence looks like:**

- `migrate:deploy` completes without error
- 5 prisma integration tests pass (not skip)
- `curl /v1/dev/status` returns `"persistence":"prisma"`
- Invite + activate + member GET succeed
- After API kill/restart, same `memberId` returns `accessStatus: active`
- `IDEMPOTENCY_OK` and `DEV_ROUTE_BLOCKED_OK` printed
- Log saved under `.step10-2-evidence/verify-*.log`

**Prerequisites Carmen must ensure:**

1. Postgres running: `brew services start postgresql@16` (see `scripts/fix-brew-postgres-icu.sh` if Homebrew ICU linkage fails), **or** Docker: `docker compose -f docker/docker-compose.yml up -d postgres`
2. Database URL: `export OS_DATABASE_URL=postgresql://isalwa:isalwa@localhost:5432/isalwa`
3. For Supabase auth verification (optional): seed `os_auth_identities` with `provider=supabase`, `providerSubject=<user id>`, `status=active`; set `OS_AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### Step 10 gate (after 10.2 verification)

**STEP 10 STATUS: CONDITIONAL PASS** (until 10.3)

Persistence + runtime tiers verified on Carmen machine (2026-08-23). Full PASS required **PRODUCTION_AUTH_VERIFIED**.

---

## Step 10.3 — Production auth verification (2026-08-24)

### Supabase CLI + project identity

| Item | Value |
|------|--------|
| CLI linked from | `apps/architect` (`supabase link --project-ref efolotcrdaqdixfiqbek`) |
| Project ref | `efolotcrdaqdixfiqbek` |
| Project name | Isalwa-Arquitect |
| Role | **Auth provider only** — credentials in Supabase Auth; OS identity in local `os_*` Postgres |
| Dedicated OS Supabase project | **None** — no ambiguity; reuse Architect project as IdP |
| Remote migrations (CLI) | 001–003 applied; 004 pending on remote |

**No new Supabase project created. No production data modified on Supabase.**

### PRODUCTION_AUTH_VERIFIED results

```bash
./scripts/verify-step-10-3.sh
```

Log: `.step10-3-evidence/verify-20260824T120200Z.log`

| Check | HTTP | Result |
|-------|------|--------|
| JWT → own member (Bearer only) | 200 | PASS |
| Dev headers only (supabase mode) | 401 | PASS |
| Bad JWT | 401 | PASS |
| JWT cross-tenant member GET | 404 | PASS |
| JWT after member terminated | 401 | PASS |

Supabase user: `carmen@isalwa.demo` (uid `f2f7158d…`) linked to local `os_auth_identities` for verification.

### Verification tier (final)

| Tier | Status |
|------|--------|
| MEMORY_VERIFIED | PASS |
| PRISMA_VERIFIED | PASS |
| RUNTIME_VERIFIED | PASS |
| PERSISTENCE_SURVIVAL_VERIFIED | PASS |
| PRODUCTION_AUTH_VERIFIED | **PASS** |
| DEV_ROUTE_SAFETY | PASS |
| HOSTING_NEUTRALITY | PASS |

### Step 10 gate (final)

**STEP 10 STATUS: FULL PASS**

### New gaps

| ID | Gap | Classification |
|----|-----|----------------|
| GAP-10.2-01 | No Postgres in agent/CI verification environment | OPS — Carmen local PASS; add CI Postgres service |
| GAP-10.2-02 | PRODUCTION_AUTH not exercised | **CLOSED** — 10.3 verify PASS |
| GAP-10.2-03 | CORS allows all origins (`cors: true`) | Deploy-time config (not Vercel-specific) |
| GAP-10.3-01 | `004_connector_credentials.sql` not on remote Supabase | OPS — Architect only; not OS gate |


