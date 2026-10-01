# Step 14.7 — Workforce Admin Mutation API Readiness

**Date:** 2026-08-24  
**Gate result:** **CONDITIONAL PASS**  
**Verify:** `./scripts/verify-step-14-7.sh`  
**Log:** `.step14-7-evidence/verify-20260824T140655Z.log`

---

## Mission summary

Verified the **UI-safe Workforce Admin mutation set** against canonical `POST /v1/commands/:commandName` routing, domain contracts, tenant/auth boundaries, lifecycle guards, provider side-effects (where applicable), and deterministic HTTP error codes — without modifying `apps/os-web` or inventing HR policy.

Lane J verdict preserved: **CONDITIONAL** overall backend; safe mutations **READY FOR UI**; invite/rehire/email-completion remain blocked at provider tier.

---

## HTTP command coverage (Part A)

All safe actions route through `CommandsController` → `WorkforceCommandService.execute`:

| Command | Route | Scope | Transaction | Event/Audit/Outbox | Idempotency |
|---------|-------|-------|-------------|-------------------|-------------|
| `ChangeDepartment` | `POST /v1/commands/ChangeDepartment` | `people.admin` | ✓ | ✓ | ✓ |
| `ChangeRole` | `POST /v1/commands/ChangeRole` | `people.admin` | ✓ | ✓ | ✓ |
| `ChangeManager` | `POST /v1/commands/ChangeManager` | `people.admin` | ✓ | ✓ | ✓ |
| `SuspendMember` | `POST /v1/commands/SuspendMember` | `people.admin` | ✓ | ✓ + provider post-commit | ✓ |
| `ActivateMember` | `POST /v1/commands/ActivateMember` | `member_active` (self invite) / `people.admin` (admin paths) | ✓ | ✓ | ✓ |
| `TerminateMember` | `POST /v1/commands/TerminateMember` | `people.admin` | ✓ | ✓ + provider post-commit | ✓ |
| `GrantDelegation` | `POST /v1/commands/GrantDelegation` | `people.admin` | ✓ | ✓ | ✓ |
| `RevokeDelegation` | `POST /v1/commands/RevokeDelegation` | `people.admin` | ✓ | ✓ | ✓ |
| `RequestMemberEmailChange` | `POST /v1/commands/RequestMemberEmailChange` | `member_active` (self only) | ✓ | ✓ | ✓ |

No alternate admin endpoints added.

---

## Safe action verification matrix

| Action | Backend | Mock/Postgres | HTTP (dev-auth) | Live Supabase | UI-safe |
|--------|---------|---------------|-----------------|---------------|---------|
| ChangeDepartment | ✓ | **15 postgres tests** | Via domain suite | N/A | **READY** |
| ChangeRole | ✓ | ✓ | **HTTP verified** | N/A | **READY** |
| ChangeManager | ✓ | ✓ | Via domain suite | N/A | **READY** |
| SuspendMember | ✓ | ✓ + 14.5/14.6 regression | **HTTP verified** | **14.6B LIVE** | **READY** |
| ActivateMember (suspended→active) | ✓ | ✓ + J-13 guard | **HTTP verified** | **14.6B LIVE** | **READY** |
| ActivateMember (invited→active) | ✓ | ✓ lifecycle tests | Not HTTP-tested (onboarding) | N/A | **READY** (first-login path) |
| TerminateMember | ✓ | ✓ + open-work block | **HTTP verified** | **14.6B LIVE** | **READY** |
| GrantDelegation | ✓ | ✓ | **HTTP verified** | N/A | **READY** |
| RevokeDelegation | ✓ | ✓ | **HTTP verified** | N/A | **READY** |
| RequestMemberEmailChange | ✓ | ✓ | **HTTP verified** | N/A | **READY** |

---

## Blocked actions (Part J)

| Action | Backend | Mock | HTTP | Live Supabase | UI-safe | Reason |
|--------|---------|------|------|---------------|---------|--------|
| InviteMember | ✓ | ✓ | Partial (tenant test) | **FAIL** (`createInvite`) | **BLOCKED** | Pilot Supabase invite/SMTP config |
| RehireMember | ✓ | ✓ | Not exercised | **DEFERRED** (14.6B) | **BLOCKED** | Same `createInvite` dependency |
| ChangeMemberEmail | ✓ | ✓ | Not exercised | **NOT VERIFIED** | **BLOCKED** | Provider `updateEmail` not live-verified |

---

## J-13 — ActivateMember lifecycle guard (Part F)

**Classification:** **CLOSED** (optional hardening applied)

**Change:** `activateMember` now accepts only:
- `accessStatus: invited` — self or admin (first login)
- `accessStatus: suspended` — **admin only** (reactivation)

**Rejects:**
- `accessStatus: revoked` / `employmentStatus: terminated` → `VALIDATION_FAILED` (must use `RehireMember`)
- `accessStatus: active` → `VALIDATION_FAILED`
- Self-reactivation from suspended → `VALIDATION_FAILED`

**Files:** `packages/os-workforce/src/workforce-command-service.ts`  
**Tests:** `workforce-lifecycle.test.ts`, `workforce-admin-mutation-api.integration.test.ts`, `workforce-admin-mutation-http.test.ts`

Provider semantics unchanged.

---

## HTTP error contract for UI (Part K)

Canonical codes via `CommandsController.mapError`:

| Situation | Code | HTTP |
|-----------|------|------|
| Missing/invalid session | `AUTH_REQUIRED` | 401 |
| Wrong tenant / forged headers | `TENANT_FORBIDDEN` | 403 |
| Suspended/revoked actor | `ACCESS_REVOKED` | 403 |
| Missing scope | `PERMISSION_DENIED` | 403 |
| Member/delegation not found | `NOT_FOUND` | 404 |
| Invalid lifecycle / open work / bad payload | `VALIDATION_FAILED` | 400 |
| Idempotency conflict | `CONFLICT` | 400 |

**Fix applied:** `ACCESS_REVOKED` now maps to **403** in `commands.controller.ts` (was 500 — real UI gap).

**Terminate with open work:** `VALIDATION_FAILED` (400) — UI should prompt reassignment first (`PRODUCTION_UI_ADMIN_SELF_SERVICE_READINESS.md`).

**Provider side-effect pending:** OS state committed; audit `auth.provider.side_effect_failed`; recovery via `RetryAuthProviderSync` (`people.admin`).

---

## Provider side-effect safety

Preserved from Steps 14.5/14.6:
- Suspend → post-commit global logout; user remains at provider
- Terminate → post-commit credential delete; AuthIdentity revoked
- Failure → OS committed; 3-attempt retry; failure audit; manual `RetryAuthProviderSync`

**Tier:** MOCK + POSTGRES + **LIVE SUPABASE (14.6B)** for suspend/terminate.

---

## Verification tiers

| Tier | Result | Count |
|------|--------|-------|
| Unit (memory) | PASS | 12 lifecycle tests |
| Postgres integration | PASS | 15 admin mutation + 19 regression |
| HTTP dev-auth | PASS | 9 admin mutation + 10 session/tenant |
| Live Supabase HTTP | **NOT EXERCISED** | Admin commands use dev session headers; provider tiers from 14.6B |

---

## Runtime code changed

| File | Change | Justified |
|------|--------|-----------|
| `workforce-command-service.ts` | J-13 ActivateMember lifecycle guard | UI-safe contract before Agent 4 |
| `commands.controller.ts` | `ACCESS_REVOKED` → HTTP 403 | Deterministic UI error (was 500) |
| `workforce-admin-mutation-api.integration.test.ts` | New | Verification |
| `workforce-admin-mutation-http.test.ts` | New | Verification |
| `workforce-lifecycle.test.ts` | J-13 regression | Verification |
| `verify-step-14-7.sh` | New | Gate script |

**G-08 touched:** **NO**

---

## Cross-lane change requests

None.

---

## Architecture drift

**NO** — extends existing command spine; no parallel admin API; no policy invention.

---

## Low-maintenance handoff

**PASS** — Agent 4 can wire UI to documented commands/errors. Provider failure recovery documented (`RetryAuthProviderSync`). Invite/rehire remain honestly blocked until pilot Supabase invite config fixed.

---

## Carmen-disappearance test

**PASS** — run `./scripts/verify-step-14-7.sh`; read this doc § UI-safe commands + error map.

---

## EXACT REVIEW REQUEST FOR AGENT 3

1. Re-run `./scripts/verify-step-14-7.sh`.
2. Confirm J-13 guard: terminated → `ActivateMember` rejected at domain + HTTP.
3. Confirm `ACCESS_REVOKED` returns 403 on command path.
4. Confirm blocked actions (Invite/Rehire/ChangeMemberEmail) not marked UI-ready.
5. Confirm no `apps/os-web` changes and G-08 untouched.

---

## EXACT NEXT ACTION

Agent 4 — implement Workforce Admin mutation UI (`apps/os-web`) for the UI-safe command set only.

---

## EXACT NEXT CURSOR PROMPT

```
UI-2 WORKFORCE ADMIN MUTATIONS — Agent 4

Read docs/architecture/STEP_14_7_WORKFORCE_ADMIN_MUTATION_API_READINESS_EVIDENCE.md
Implement mutation surfaces in apps/os-web for UI-safe commands only.
Do NOT expose InviteMember, RehireMember, or ChangeMemberEmail until provider tier unblocks.
Use POST /v1/commands/:commandName with documented error codes.
```

---

## Defect closure — ChangeDepartment invalid departmentId (2026-08-27)

**Source:** UI-LIVE-3 live verification  
**Status:** **CLOSED**

**Defect:** `ChangeDepartment` with nonexistent `departmentId` hit Postgres FK and returned HTTP **500**.

**Root cause:** No org-scoped department existence check before `insertDepartmentAssignment`.

**Fix:** `getDepartmentInOrg(organizationId, departmentId)` + throw `VALIDATION_FAILED` before mutation. Foreign-tenant department IDs fail the same way (org-scoped lookup) — no existence leak.

**Contract after fix:**
| Case | Code | HTTP |
|------|------|------|
| Nonexistent departmentId | `VALIDATION_FAILED` | 400 |
| Foreign-tenant departmentId | `VALIDATION_FAILED` | 400 |
| Valid same-tenant department | success | 201 |

On failure: no assignment mutation, no event, no audit, no outbox.

**Verify:** `./scripts/verify-step-14-7.sh`