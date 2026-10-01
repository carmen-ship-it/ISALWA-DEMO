# Step 14.6 — Auth Provider Lifecycle Evidence

**Phase:** Step 14.6 — Suspend/terminate auth provider session revocation  
**Date:** 2026-08-24  
**Gate result:** **CONDITIONAL PASS** (MOCK-TESTED + HTTP session denial; Supabase Admin API PROVIDER-VERIFICATION-PENDING)

**Verification log:** `.step14-6-evidence/verify-20260824T133951Z.log`

---

## Contract audit (STEP_9 §4.2)

| Question | Classification | Answer |
|----------|----------------|--------|
| Must suspension revoke provider sessions immediately? | **CONTRACTED** | Yes — "Revoke sessions" on `SuspendMember` |
| Must termination revoke provider sessions/credentials? | **CONTRACTED** | Yes — "Revoke credentials + sessions" on `TerminateMember` |
| Provider disable vs sign-out? | **PARTIAL** | Suspend: global session sign-out (credentials preserved). Terminate: delete provider user (credentials revoked) |
| Reactivation provider action? | **CONTRACTED** | No relink required if credentials preserved — user re-authenticates; `ActivateMember` restores OS access only |
| Rehire provider action? | **CONTRACTED** | New invite via `createInvite`; new `AuthIdentity` row (`invited`) |
| Provider failure after OS commit? | **CONTRACTED** | OS access remains suspended/terminated; post-commit bounded retry; audit on failure; manual `RetryAuthProviderSync` |

**Authority boundary preserved:** OS owns `accessStatus`/employment; provider owns credentials/sessions.

---

## Implementation

| File | Change |
|------|--------|
| `packages/os-workforce/src/auth-provider.ts` | Added `revokeSessions()`; local port tracks session vs credential revoke |
| `packages/os-workforce/src/supabase-auth-provider.ts` | `POST /auth/v1/admin/users/{id}/logout` scope `global` for suspend |
| `packages/os-workforce/src/provider-side-effects.ts` | Bounded post-commit retry (3 attempts) |
| `packages/os-workforce/src/workforce-command-service.ts` | Suspend schedules `revokeSessions`; terminate uses retry wrapper; `RetryAuthProviderSync` command |
| `packages/os-contracts/src/commands.ts` | `RetryAuthProviderSync` command + schema |
| `packages/os-workforce/src/os-workforce-store.ts` | `appendStandaloneAudit` for provider failure visibility |
| `apps/os-api/src/os-session.ts` | Dev headers + JWT path deny non-active members at session resolution |
| `packages/os-database/src/auth-provider-lifecycle.integration.test.ts` | 8 postgres tests |
| `apps/os-api/src/member-capability-runtime.test.ts` | Revoked member HTTP denial (closed foundation gap) |
| `scripts/verify-step-14-6.sh` | Verification gate |

### Sequence (post-commit provider effects)

1. OS transaction commits lifecycle change (`accessStatus`, events, audit, outbox, idempotency).
2. Post-commit: provider side effect with 3-attempt retry.
3. On failure: `auth.provider.side_effect_failed` audit row (no OS rollback).
4. Operator: `RetryAuthProviderSync` (`people.admin`, `{ memberId }`).

---

## Exact provider behaviors

### SuspendMember

| Layer | Behavior |
|-------|----------|
| OS | `accessStatus: suspended`; `AuthIdentity` stays `active` |
| Provider | `revokeSessions(providerSubject)` — global logout |
| Supabase | `POST .../admin/users/{id}/logout` `{ scope: "global" }` |

### TerminateMember

| Layer | Behavior |
|-------|----------|
| OS | `accessStatus: revoked`, employment terminated; `AuthIdentity` → `revoked` |
| Provider | `revokeCredentials(providerSubject)` — delete user |
| Supabase | `DELETE .../admin/users/{id}` (existing) |

### ActivateMember (reactivate suspended)

| Layer | Behavior |
|-------|----------|
| OS | `accessStatus: active` |
| Provider | No automatic call — user obtains new session on next login |

### RehireMember

| Layer | Behavior |
|-------|----------|
| OS | New `OrganizationMember` + new `AuthIdentity` (`invited`) |
| Provider | `createInvite(email)` |

---

## Recovery procedure

1. Confirm member state in OS (`accessStatus` suspended/revoked).
2. Check audit for `auth.provider.side_effect_failed`.
3. Retry: `POST /v1/commands/RetryAuthProviderSync` body `{ "memberId": "..." }` with `people.admin` session.
4. Verify audit `auth.provider.sync_completed` or provider-side session/credential state.

OS governed API access remains blocked regardless of provider sync state.

---

## Verification tiers

| Tier | Status | Evidence |
|------|--------|----------|
| MOCK-TESTED | **PASS** | 8/8 `auth-provider-lifecycle.integration.test.ts` |
| POSTGRES | **PASS** | Lifecycle + Step 14.5 regression |
| HTTP SESSION | **PASS** | Dev headers deny suspended/revoked; 36/36 os-api tests |
| SUPABASE ADMIN API | **PROVIDER-VERIFICATION-PENDING** | Adapter implemented; no live non-prod Supabase exercise in gate log |

---

## Step 14.5 gap update

| Gap | Before | After |
|-----|--------|-------|
| Auth provider session revoke on suspend | OPEN | **PARTIAL** — MOCK-TESTED; Supabase live pending |

---

## Carmen handoff

### WHERE WE ARE

Step 14.6 closes the Step 14.5 auth-provider gap at the implementation and mock-verification tier. OS authorization is primary; provider revocation is defense-in-depth post-commit.

### SUSPEND PROVIDER BEHAVIOR

Post-commit `revokeSessions` (global sign-out). OS `AuthIdentity` remains active for reactivation.

### TERMINATE PROVIDER BEHAVIOR

Post-commit `revokeCredentials` (delete provider user). OS `AuthIdentity` marked revoked in transaction.

### REACTIVATE PROVIDER BEHAVIOR

No provider admin call. User re-authenticates after OS `ActivateMember`.

### REHIRE PROVIDER BEHAVIOR

New provider invite via `createInvite`; new OS `AuthIdentity`.

### OLD JWT AFTER SUSPEND

**DENIED** — `sessionFromSupabaseJwt` requires active member; dev headers check `accessStatus === active`.

### OLD JWT AFTER TERMINATION

**DENIED** — same session gates + `AuthIdentity.status !== active` on JWT path.

### PROVIDER FAILURE SAFETY

**PASS** — OS state committed; 3-attempt retry; failure audit; `RetryAuthProviderSync` recovery.

### RECOVERY PATH

`RetryAuthProviderSync` command by `people.admin`; see Recovery procedure above.

### PROVIDER VERIFICATION TIER

**MOCK** (local port) + **HTTP session denial verified** + **LIVE SUPABASE (Step 14.6B)** — suspend/terminate verified on pilot project `efolotcrdaqdixfiqbek`; rehire invite deferred.

### WHAT POSTGRES PROVED

8 auth-provider lifecycle tests + 11 Step 14.5 suspend tests

### WHAT SUPABASE PROVED

Live Admin API on pilot project (Step 14.6B): global logout on suspend (user remains); user deletion on terminate; old JWT denied (403 suspend / 401 terminate). Rehire `createInvite` failed on pilot — deferred.

### WHAT IS NOT VERIFIED

- Live Supabase rehire invite path (Test D deferred — `PROVIDER_INVITE_FAILED`)
- Automatic scheduled retry of failed provider sync (manual command only)
- Old JWT after reactivate when provider token still valid (OS gate re-opens; documented conditional behavior)

### CROSS-LANE CHANGE REQUESTS

None.

### ARCHITECTURE DRIFT

**NO** — extends existing `AuthProviderPort` and post-commit pattern from Step 10/14.1.

### LOW-MAINTENANCE HANDOFF

**PASS**

### CARMEN-DISAPPEARANCE TEST

**PASS** — run `./scripts/verify-step-14-6.sh`; read this doc § Recovery procedure.

### DOES THIS CLOSE THE AUTH-PROVIDER GAP FROM STEP 14.5?

**YES** (live Supabase tier for suspend/terminate; rehire invite deferred).

---

## Step 14.6B — Live Supabase Provider Verification

**Date:** 2026-08-24  
**Gate result:** **CONDITIONAL PASS**  
**Log:** `.step14-6b-evidence/verify-20260824T135127Z.log`  
**Verify:** `./scripts/verify-step-14-6b.sh`

### Environment pre-flight

| Check | Result |
|-------|--------|
| Project ref | `efolotcrdaqdixfiqbek` (documented pilot/dev — Step 10.3) |
| Non-production | **CONFIRMED** — Architect pilot project, not production OS tenant |
| Service role available | **YES** (from `apps/architect/.env.local`, not logged) |
| Synthetic users only | **YES** — `isalwa-auth-test+*@isalwa.demo` |

### Live results (real Supabase Admin API + real JWT)

| Test | Result | Evidence |
|------|--------|----------|
| A — Suspend | **PASS** | OS `suspended`; AuthIdentity `active`; provider user **PRESENT**; old real JWT → HTTP **403** |
| B — Reactivate | **CONDITIONAL PASS** | OS `active`; new login works; old JWT may work if provider token not expired (documented) |
| C — Terminate | **PASS** | OS `revoked/terminated`; AuthIdentity `revoked`; provider user **MISSING**; old JWT → HTTP **401** |
| D — Rehire | **DEFERRED** | Live `createInvite` returned `PROVIDER_INVITE_FAILED` on pilot project |

### Denial layer analysis (Test A)

Old JWT after suspend returned **403** while provider user remained present → denial driven by **OS membership gate** (`accessStatus=suspended`) with provider global logout executed post-commit. Both layers align with Step 9 (OS primary, provider defense-in-depth).

### Secret hygiene

Log scanned: no service-role keys, no full JWTs, no passwords.

### Cleanup

Synthetic provider user A deleted after test. User B deleted by terminate path. No unintended provider accounts left active.

### Verification tiers (updated)

| Tier | Status |
|------|--------|
| MOCK | PASS |
| HTTP/OS | PASS |
| LIVE SUPABASE TEST PROJECT | **CONDITIONAL PASS** (suspend + terminate verified; rehire invite deferred) |

### Step 14.5 gap update

Auth provider session revoke on suspend: **OPEN → PARTIAL → CLOSED (live suspend/terminate)** with rehire invite still deferred at provider tier.

---

### EXACT REVIEW REQUEST FOR AGENT 3

1. Re-run `./scripts/verify-step-14-6b.sh` on pilot project `efolotcrdaqdixfiqbek`.
2. Confirm synthetic-only users and cleanup.
3. Confirm suspend leaves provider user present and denies old JWT.
4. Confirm terminate deletes provider user and denies old JWT (401).
5. Accept rehire live invite as DEFERRED unless pilot Supabase invite config is fixed.
6. Update Step 14.6 overall gate if satisfied.

### EXACT NEXT ACTION

Agent 3 independent re-review of Step 14.6 + 14.6B evidence tiers.

### EXACT NEXT CURSOR PROMPT

```
STEP 14.6 / 14.6B INDEPENDENT RE-REVIEW — Auth provider lifecycle tiers

Read docs/architecture/STEP_14_6_AUTH_PROVIDER_LIFECYCLE_EVIDENCE.md (incl. 14.6B section)
Run ./scripts/verify-step-14-6.sh and ./scripts/verify-step-14-6b.sh
Confirm MOCK vs LIVE SUPABASE tiers. Update ARCHITECTURE_EVIDENCE_REGISTER if gates close.
```
