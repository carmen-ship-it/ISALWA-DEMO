# Step 14.1 — Workforce Transactional Completion Evidence

**Phase:** Step 14.1 — Close Step 11 workforce transactional/idempotency deferral  
**Date:** 2026-08-24  
**Gate result:** **PASS**

**Rule:** **VERIFIED** requires reproducible Postgres/runtime evidence in this document.

**Verification log:** `.step14-1-evidence/verify-20260824T124850Z.log`

---

## Mission

Every authoritative workforce command in `@isalwa/os-workforce` must use the same atomic pattern as PartyGraph (Step 12) and Work (Step 14):

```
BEGIN TRANSACTION
  1. authorize (trusted session / effective membership)
  2. validate lifecycle transition
  3. check command idempotency (read before tx; write inside tx)
  4. authoritative domain mutation
  5. append BusinessEvent
  6. append AuditLog
  7. append Outbox record
  8. persist command idempotency result
COMMIT
```

Post-commit only: external auth provider side effects (`updateEmail`, `revokeCredentials`).

---

## Pre-implementation audit (2026-08-24)

| Command | Before | Classification |
|---------|--------|----------------|
| `InviteMember` | Domain + emit in tx; idempotency **outside** tx | NEEDS IDEMPOTENCY FIX |
| `ActivateMember` | Domain then emit; idempotency outside | NEEDS BOTH |
| `RequestMemberEmailChange` | Same | NEEDS BOTH |
| `ChangeMemberEmail` | Same | NEEDS BOTH |
| `ChangeDepartment` | Same | NEEDS BOTH |
| `ChangeRole` | Same | NEEDS BOTH |
| `ChangeManager` | Same | NEEDS BOTH |
| `GrantDelegation` | Same | NEEDS BOTH |
| `RevokeDelegation` | Same | NEEDS BOTH |
| `SuspendMember` | Same | NEEDS BOTH |
| `TerminateMember` | Same | NEEDS BOTH |
| `RehireMember` | Same | NEEDS BOTH |

**Not in workforce:** `ReassignWork` — owned by `@isalwa/os-work` (Step 14). Not reintroduced.

---

## Post-implementation (all 12 commands)

| Command | Transaction boundary | Idempotency inside tx | Event + audit + outbox |
|---------|---------------------|----------------------|------------------------|
| `InviteMember` | `runInTransaction` | ✓ | ✓ |
| `ActivateMember` | `runInTransaction` | ✓ | ✓ |
| `RequestMemberEmailChange` | `runInTransaction` | ✓ | ✓ |
| `ChangeMemberEmail` | `runInTransaction` | ✓ | ✓ (provider email update post-commit) |
| `ChangeDepartment` | `runInTransaction` | ✓ | ✓ |
| `ChangeRole` | `runInTransaction` | ✓ | ✓ |
| `ChangeManager` | `runInTransaction` | ✓ | ✓ |
| `GrantDelegation` | `runInTransaction` | ✓ | ✓ |
| `RevokeDelegation` | `runInTransaction` | ✓ | ✓ |
| `SuspendMember` | `runInTransaction` | ✓ | ✓ |
| `TerminateMember` | `runInTransaction` | ✓ | ✓ (provider revoke post-commit) |
| `RehireMember` | `runInTransaction` | ✓ | ✓ |

**Implementation:** `WorkforceCommandService.execute()` wraps every command in `store.runInTransaction()`. Idempotency record is written inside the same transaction after the handler completes. `runInTransaction` is **required** — missing implementation throws `TRANSACTION_REQUIRED`.

---

## Code changes

| File | Change |
|------|--------|
| `packages/os-workforce/src/workforce-command-service.ts` | Single tx wrapper; handlers receive transactional store; idempotency inside tx; post-commit auth hooks |
| `packages/os-workforce/src/os-workforce-store.ts` | `runInTransaction` required on port |
| `packages/os-database/src/prisma-workforce-store.ts` | Test hook `testFailNextAppend`; flag propagation into scoped tx store |
| `packages/os-database/src/workforce-transaction.integration.test.ts` | Atomic, rollback, idempotency, tenant tests |
| `scripts/verify-step-14-1.sh` | Build + workforce unit + os-database + os-api smoke |

No shared contract changes. No PartyGraph, Work, outbox worker, or Lane F modifications.

---

## Cross-lane boundary (Work)

- `TerminateMember` reads open work via `listOpenWorkItemsForMember` (read-only on `os_work_items`).
- Blocks termination when open work exists; does **not** mutate WorkItem ownership.
- `ReassignWork` remains in `@isalwa/os-work` only.

---

## Postgres verification

**Environment:** `OS_DATABASE_URL=postgresql://isalwa:isalwa@localhost:5432/isalwa`

| Test | Proves |
|------|--------|
| `ChangeRole persists domain + event + audit + outbox + idempotency atomically` | Domain row + counts + idempotency key on event + replay |
| `GrantDelegation atomic write includes outbox row` | Outbox increment |
| `transaction rolls back when outbox append fails` | Intentional `TEST_APPEND_FAIL` — zero partial domain/event/outbox |
| `RevokeDelegation is atomic with event and audit` | Delegation revoke + event |
| `cross-tenant workforce command rejected` | `TENANT_FORBIDDEN` |
| `workforce prisma integration` (5 tests) | Full lifecycle, invite idempotency, terminate/rehire |
| `workforce lifecycle` unit tests (11) | Auth, delegation expiry, terminate, rehire, audit |
| Regression: outbox (5), party (9), work (7), projection (5) | No breakage |

**Totals (verify log):** os-database 36/36 pass · os-workforce 11/11 · os-api 2/2

---

## Rollback / failure test

`PrismaOsWorkforceStore.testFailNextAppend = true` before `ChangeRole` causes `appendEventAndAudit` to throw inside the Prisma transaction. Verified:

- Role assignment count unchanged
- BusinessEvent count unchanged
- Outbox count unchanged

---

## Idempotency test

Duplicate `commandId` / idempotency key on `ChangeRole` replay returns stored result without duplicating role assignment or events (`workforce-transaction.integration.test.ts`). Invite idempotency covered in `workforce-prisma.integration.test.ts`.

---

## Security / negative coverage

| Scenario | Where verified |
|----------|----------------|
| Cross-tenant command | transaction integration + os-api + unit |
| Terminated/inactive actor | unit + prisma integration |
| Invalid lifecycle / permission | unit (`PERMISSION_DENIED`, delegation expiry) |
| Duplicate commandId | ChangeRole + InviteMember postgres |
| Transaction rollback | intentional append failure |
| Client-supplied tenant cannot become authority | os-api session + `TENANT_FORBIDDEN` on actor/org mismatch |

---

## Step 11 deferral resolution

| Step 11 deferral | Step 14.1 status |
|------------------|------------------|
| All commands in single DB transaction | **CLOSED** — all 12 workforce commands |
| Idempotency inside transaction | **CLOSED** |
| Transactional outbox on all commands | **CLOSED** |

Remaining Step 11 deferrals **unchanged** (not Step 14.1 scope):

- Dedicated outbox worker host process
- Outbox observability HTTP API

---

## Gate decision

| Criterion | Status |
|-----------|--------|
| Every os-workforce command uses canonical atomic tx | **PASS** |
| No partial domain/event/audit/outbox/idempotency state | **PASS** (rollback test) |
| ReassignWork not in workforce | **PASS** |
| Postgres evidence | **PASS** |
| Regression PartyGraph / Work / Outbox | **PASS** |
| Shared contract drift | **NONE** |

---

## Low-maintenance handoff

- Workforce administration is **API-only** (`apps/os-api` command routes); no product UI required for normal backend operation.
- No manual SQL, CLI repair, or Carmen-specific procedures for lifecycle commands.
- Verification: `./scripts/verify-step-14-1.sh` with local Postgres + migrations applied.
- External auth provider (`LocalAuthProviderPort` / Supabase) side effects run post-commit; failure after commit requires operational replay (documented in Step 10/11 — not new).

---

## Carmen handoff

### WHERE WE ARE

Step 11 workforce transactional deferral is **closed**. All 12 authoritative workforce commands in `@isalwa/os-workforce` share the same production-grade transaction pattern as PartyGraph and Work. Step 14.1 gate **PASS** with Postgres evidence.

### WORKFORCE COMMANDS AUDITED

| Command | Before | After | Verified |
|---------|--------|-------|----------|
| `InviteMember` | Tx partial; idempotency outside | Full atomic tx + idempotency inside | Postgres lifecycle + idempotency |
| `ActivateMember` | Emit after write | Full atomic tx | Postgres lifecycle |
| `RequestMemberEmailChange` | Emit after write | Full atomic tx | Unit test |
| `ChangeMemberEmail` | Emit after write | Full atomic tx + post-commit provider | Unit test |
| `ChangeDepartment` | Emit after write | Full atomic tx | Code path (same execute) |
| `ChangeRole` | Emit after write | Full atomic tx | Postgres atomic + idempotency + rollback |
| `ChangeManager` | Emit after write | Full atomic tx | Postgres lifecycle |
| `GrantDelegation` | Emit after write | Full atomic tx | Postgres atomic |
| `RevokeDelegation` | Emit after write | Full atomic tx | Postgres atomic |
| `SuspendMember` | Emit after write | Full atomic tx | Code path (same execute) |
| `TerminateMember` | Emit after write | Full atomic tx + open-work guard | Postgres lifecycle + work integration |
| `RehireMember` | Emit after write | Full atomic tx | Postgres lifecycle + unit |

### WHAT ACTUALLY CHANGED

- `WorkforceCommandService.execute()` — all commands in one `runInTransaction`; idempotency save inside tx.
- Handlers take transactional `store`; `emit()` writes event/audit/outbox via `appendEventAndAudit` in same tx.
- `runInTransaction` required on workforce store port.
- Integration tests + `verify-step-14-1.sh`.
- Test hook for rollback proof on Prisma store.

### WHAT POSTGRES PROVED

Domain + BusinessEvent + AuditLog + Outbox + idempotency are atomic for representative commands (`ChangeRole`, `GrantDelegation`, `RevokeDelegation`). Rollback leaves zero artifacts. Full suite: 36/36 os-database tests including party/work/outbox/projection regression.

### ROLLBACK / FAILURE TEST

**PASS** — `testFailNextAppend` on `ChangeRole`; transaction aborted; counts unchanged.

### IDEMPOTENCY TEST

**PASS** — `ChangeRole` and `InviteMember` duplicate key replay does not duplicate state or events.

### WHAT IS NOT VERIFIED

- Individual Postgres probes for `ChangeDepartment`, `SuspendMember`, `RequestMemberEmailChange` (same code path; not separately counted).
- Post-commit auth provider failure recovery (pre-existing operational concern).
- Outbox worker long-running host (Step 11 deferral).

### STEP 11 DEFERRAL STATUS

**CLOSED** (workforce transactional/idempotency items). Step 11 worker-host and observability deferrals remain open.

### CROSS-LANE IMPACT

**None.** No contract changes. Work commands untouched. Terminate still read-only on work items.

### ARCHITECTURE DRIFT

**NO**

### LOW-MAINTENANCE HANDOFF

**PASS**

### CARMEN REQUIRED FOR NORMAL OPERATION

**NO** — API + migrations + verify script sufficient. Product UI for workforce admin not built yet (backend-only).

### REPLACEMENT DEVELOPER TEST

**PASS** — run `./scripts/verify-step-14-1.sh` with Postgres.

### NEW MAINTENANCE BURDEN

**NONE** (beyond existing API-only workforce administration until UI exists).

### DOES THIS REMOVE THE WORKFORCE BLOCKER FOR COMMERCIAL?

**YES** — Commercial no longer inherits inconsistent workforce command transactions.

### WHAT COMMERCIAL IS STILL WAITING ON

- Lane F projection/read models (parallel agent).
- Lane G Commercial implementation (not started).
- Outbox worker host for production dispatch (Step 11 deferral).

### EXACT NEXT ACTION

Proceed with Lane G Commercial command surface once Lane F projection gate clears (or in parallel if manifest allows read-model dependency only).

### EXACT NEXT CURSOR PROMPT

```
STEP 15 / LANE G — COMMERCIAL COMMAND FOUNDATION (read Lane F status first)

Read docs/architecture/STEP_14_1_WORKFORCE_TRANSACTIONAL_COMPLETION_EVIDENCE.md and handoff-manifest.yaml.
Do NOT modify workforce transaction code, PartyGraph internals, Work internals, or Lane F projection code unless CROSS_LANE_CHANGE_REQUEST.

Implement the first authoritative Commercial commands on PartyGraph + transactional outbox pattern, with Postgres verification and evidence doc.
```
