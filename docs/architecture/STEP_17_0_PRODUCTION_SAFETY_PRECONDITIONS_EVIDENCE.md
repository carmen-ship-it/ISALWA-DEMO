# Step 17.0 — Production Safety Preconditions Evidence

**Phase:** Step 17.0 — Environment validation + fail-closed guards  
**Date:** 2026-08-24  
**Gate result:** **PASS**

**Verification log:** `.step17-0-evidence/verify-20260824T131308Z.log`

---

## Mission outcome

Close provider-neutral production safety gaps **before** host selection. os-api now **fails closed** on unsafe configuration instead of silently enabling dev behavior.

---

## Implementation

| File | Purpose |
|------|---------|
| `apps/os-api/src/env-validation.ts` | Canonical startup validation + runtime profile matrix |
| `apps/os-api/src/main.ts` | Validates env before Nest boot; structured error, exit 1 |
| `apps/os-api/src/app.module.ts` | Registers `BootstrapController` only when dev bootstrap enabled |
| `apps/os-api/src/bootstrap.controller.ts` | Defense-in-depth `404` when dev bootstrap disabled |
| `apps/os-api/src/os-session.ts` | Invalid auth mode rejected; dev headers blocked outside development profile |
| `apps/os-api/src/health.controller.ts` | Split liveness (`GET /v1/health`) vs readiness (`GET /v1/health/ready`) |
| `apps/os-api/src/readiness.ts` | Database ping helper |
| `apps/os-api/src/preflight.ts` | Non-mutating pre-deploy validation |
| `apps/os-api/.env.example` | Documented OS env template |
| `scripts/os-production-preflight.sh` | Operator preflight wrapper |
| `scripts/verify-step-17-0.sh` | Verification gate |
| `apps/os-api/src/env-validation.test.ts` | Validation + startup fail-closed tests |
| `apps/os-api/src/production-safety.test.ts` | Bootstrap guard, health, session tests |

---

## Configuration matrix

| Profile | `OS_AUTH_MODE` | `OS_DATABASE_URL` | Supabase vars | Dev bootstrap | Default if unset |
|---------|----------------|-------------------|---------------|---------------|------------------|
| **development** | `dev` (default) or `supabase` | Optional (memory partial) | Required if `supabase` | Enabled only when `dev` + development profile | `OS_RUNTIME_PROFILE=development` |
| **staging** | `supabase` (required) | **Required** | **Required** | **Disabled** | — |
| **production** | `supabase` (required) | **Required** | **Required** | **Disabled** | Inferred when `NODE_ENV=production` |

**Explicit override:** `OS_RUNTIME_PROFILE=development|staging|production`

**Legacy boundary:** If only `DATABASE_URL` is set (no `OS_DATABASE_URL`) on staging/production → startup **FAILS** with explicit message. os-api never reads `DATABASE_URL`.

---

## Dev route safety

| Invariant | Mechanism | Verified |
|-----------|-----------|----------|
| Staging/production cannot register `/v1/dev/*` | `isDevBootstrapEnabled()` in `app.module.ts` | subprocess smoke |
| Controller returns 404 if misregistered | `BootstrapController.assertDevBootstrapEnabled()` | unit test |
| Dev headers cannot auth in supabase mode | `resolveSession` → JWT only | unit test |
| Dev headers blocked outside development profile | `getRuntimeProfile() !== 'development'` guard | code + validation |

---

## Health / readiness

| Endpoint | Purpose | HTTP |
|----------|---------|------|
| `GET /v1/health` | **Liveness** — process running | 200 always when up |
| `GET /v1/health/ready` | **Readiness** — DB + worker (if enabled) | 200 ready / 503 not_ready |

Readiness does **not** fail on projection lag or outbox pending count alone.

---

## Secret leak review

| Surface | Result |
|---------|--------|
| Startup validation errors | Message only — no URLs/passwords |
| Health/readiness JSON | Public runtime snapshot — no secrets |
| Preflight stdout | Profile/mode flags only |
| Startup subprocess test | Password `SECRET` not in stderr |

**PASS**

---

## Runtime verification (LOCAL/TEST)

| # | Test | Result |
|---|------|--------|
| 1 | Valid dev config boots | PASS (HTTP smoke) |
| 2 | Valid staging-like supabase config passes validation | PASS |
| 3 | Invalid `OS_AUTH_MODE` fails startup | PASS |
| 4 | Missing `OS_DATABASE_URL` on staging fails | PASS |
| 5 | Missing Supabase config in supabase mode fails | PASS |
| 6 | Dev bootstrap blocked staging profile | PASS |
| 7 | Dev headers ignored in supabase mode | PASS |
| 8 | Secrets absent from validation errors | PASS |
| 9 | Liveness works | PASS |
| 10 | Readiness reports DB failure (503) | PASS |
| 11 | No fallback to legacy `DATABASE_URL` | PASS |
| 12 | Preflight exit codes | PASS |

---

## Step 17 handoff gap closure

| Gap | Before | Now | Remaining dependency |
|-----|--------|-----|----------------------|
| **HG-17-04** dev bootstrap safety | Edge-only guidance | **CLOSED** — app-level fail-closed + tests | Edge block still recommended defense-in-depth |
| **HG-17-05** DATABASE_URL coexistence | Documented only | **CLOSED** — explicit validation error; Prisma uses `OS_DATABASE_URL` only | Legacy apps still use `DATABASE_URL` separately |
| **HG-17-01** hosting | OPEN | OPEN | ISALWA host selection |
| **HG-17-02** Supabase JWT E2E | OPEN | PARTIAL — validation enforced; live JWT path not production-verified | Staging deploy |
| **HG-17-03** centralized monitoring | OPEN | OPEN | Host-level decision |
| **HG-17-06** scheduled backups | OPEN | OPEN | Host cron / provider backup |

---

## Operator commands

```bash
# Pre-deploy (no mutations, no secrets printed)
./scripts/os-production-preflight.sh

# Staging/production-like preflight
OS_RUNTIME_PROFILE=staging \
OS_AUTH_MODE=supabase \
OS_DATABASE_URL=postgresql://... \
SUPABASE_URL=https://....supabase.co \
SUPABASE_ANON_KEY=... \
./scripts/os-production-preflight.sh

# Full gate
./scripts/verify-step-17-0.sh

# Liveness
./scripts/os-health-check.sh

# Readiness (optional)
OS_HEALTH_CHECK_READINESS=1 ./scripts/os-health-check.sh
```

---

## Why won't the app boot? (replacement developer)

1. Run `./scripts/os-production-preflight.sh` — JSON reason on stderr.
2. Common failures:
   - `OS_AUTH_MODE=dev` with `OS_RUNTIME_PROFILE=staging|production`
   - Missing `OS_DATABASE_URL` on staging/production
   - Missing `SUPABASE_URL` / `SUPABASE_ANON_KEY` when `OS_AUTH_MODE=supabase`
   - Invalid `OS_AUTH_MODE` value
   - Only `DATABASE_URL` set — must set `OS_DATABASE_URL` explicitly

---

## Cross-lane changes

**NONE** — os-api ops/safety only. No edits to `packages/os-commercial`, `packages/os-query`, or `apps/os-web`.

---

## Architecture drift

**NO**

---

## Exact next action

**ISALWA:** Select hosting; run staging deploy with `OS_RUNTIME_PROFILE=staging` + `./scripts/os-production-preflight.sh` before first traffic.

---

## Exact next Cursor prompt (Agent 1)

```
STEP 17.1 — STAGING DEPLOY SMOKE (after ISALWA selects host)

Deploy os-api with OS_RUNTIME_PROFILE=staging, OS_AUTH_MODE=supabase, OS_DATABASE_URL,
SUPABASE_URL, SUPABASE_ANON_KEY. Run os-production-preflight.sh and post-deploy health/ready
checks. Document PRODUCTION-VERIFIED tier in STEP_17_1_STAGING_DEPLOY_EVIDENCE.md.
```
