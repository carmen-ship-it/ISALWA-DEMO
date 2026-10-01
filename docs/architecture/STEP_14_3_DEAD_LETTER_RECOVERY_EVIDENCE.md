# Step 14.3 — Governed Dead-Letter Recovery Evidence

**Phase:** Step 14.3 — Close exceptional dead-letter recovery gap  
**Date:** 2026-08-24  
**Gate result:** **PASS**

**Verification log:** `.step14-3-evidence/verify-20260824T130039Z.log`

---

## Recovery model challenge

| Question | Answer |
|----------|--------|
| What identifies delivery? | `os_outbox_messages.id` (outboxId) + `event_id` → canonical `os_business_events.id` |
| Consumer dedup after DL? | Row in `os_outbox_consumer_dedup` may exist if delivery was attempted; **governed recovery clears dedup for that event** so consumers can run again (operator attests fix) |
| Retry same delivery ID? | **Yes** — same outbox row and BusinessEvent; no new event fabricated |
| New attempt record? | **AuditLog** `outbox.dead_letter.recovery_requested` with before/after JSON preserving prior failure |
| Attempt history visible? | Audit `beforeJson`: status, attemptCount, lastError; `afterJson`: recoveryReason, recoveredBy, prior* fields |
| Consumer still broken? | Worker retries → dead_letters again with new `last_error`; recovery audit preserved |
| Idempotent recovery command? | `os_idempotency_keys` inside recovery transaction |

**Semantic:** Requeue dead-letter outbox row to `pending` with fresh attempt budget — **not** arbitrary replay of published events.

---

## Implementation

| File | Purpose |
|------|---------|
| `packages/os-contracts/src/operations-commands.ts` | `RetryDeadLetterDelivery` payload schema |
| `packages/os-contracts/src/scopes.ts` | Requires `people.admin` |
| `packages/os-events/src/outbox-recovery-service.ts` | Auth + idempotency + orchestration |
| `packages/os-database/src/prisma-outbox-store.ts` | Transactional requeue, dedup clear, audit, idempotency |
| `apps/os-api/src/operations.controller.ts` | List/inspect/retry HTTP surface |
| `packages/os-database/src/outbox-recovery.integration.test.ts` | Postgres evidence |
| `scripts/verify-step-14-3.sh` | Verification gate |

### API (people.admin, tenant-scoped, no payloads by default)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/operations/outbox/dead-letters` | List DL summaries |
| GET | `/v1/operations/outbox/dead-letters/:outboxId` | Inspect one DL |
| POST | `/v1/operations/outbox/dead-letters/:outboxId/retry` | Body: `{ reason }`, header: `x-idempotency-key` |

---

## Operator procedure (no SQL)

1. `GET /v1/operations/outbox` — confirm dead-letter count.
2. `GET /v1/operations/outbox/dead-letters` — identify `outboxId` + `lastError`.
3. Fix consumer bug / downstream cause.
4. `POST .../retry` with explicit reason (min 3 chars) + idempotency key.
5. Worker (Step 14.2 host) dispatches automatically.
6. Confirm via `GET .../dead-letters/:outboxId` or outbox health — status `published`.

**When NOT to retry:** repeated failures without root-cause fix — investigate engineering; do not loop recovery.

---

## Postgres verification

| Test | Proves |
|------|--------|
| failure → DL → recovery → worker success | Full happy path + audit + event identity preserved |
| recovery idempotency | Duplicate key → same result, single requeue |
| cross-tenant recovery rejected | `NOT_FOUND`, DL unchanged |
| non-admin denied | `PERMISSION_DENIED` |
| published cannot recover | `NOT_FOUND` |
| recovery while consumer still fails | Returns to `dead_letter`, audit count = 1 |

**Suite:** 15/15 pass (recovery + outbox + runtime) · os-api 2/2

---

## Step 14.2 item closure

| Item | Before | Now |
|------|--------|-----|
| Governed dead-letter replay/recovery | OPEN | **CLOSED** |

---

## Carmen handoff

### WHERE WE ARE

Dead-letter recovery is a governed, audited, idempotent operational command. No SQL required for normal recovery.

### RECOVERY MODEL CHOSEN

**Requeue same outbox row** (`dead_letter` → `pending`) with audit trail, dedup reset for redelivery, fresh worker retry cycle. Original BusinessEvent unchanged.

### WHAT ACTUALLY CHANGED

- `RetryDeadLetterDelivery` operational command + `OutboxRecoveryService`
- Prisma transactional recovery with audit + idempotency
- Operations HTTP endpoints for list/inspect/retry
- Integration tests + verify script

### WHAT POSTGRES/RUNTIME PROVED

Full DL → recovery → publish path; idempotency; security negatives; repeated failure safety.

### FAILURE → DEAD LETTER → RECOVERY → SUCCESS TEST

**PASS**

### REPEATED FAILURE TEST

**PASS**

### SECURITY NEGATIVE TESTS

Cross-tenant **PASS** · non-admin **PASS** · published replay blocked **PASS**

### IDEMPOTENCY STATUS

**PASS** (command + consumer dedup on successful republish)

### ORIGINAL EVENT HISTORY PRESERVED

**YES** — `os_business_events` row unchanged; failure metadata in audit `beforeJson`

### DIRECT SQL REQUIRED FOR NORMAL RECOVERY

**NO**

### WHAT IS NOT VERIFIED

- HTTP-level integration test for POST retry (service-layer Postgres tests cover logic)
- UI for dead-letter admin (deferred to apps/os-web)

### CROSS-LANE CHANGE REQUESTS

**NONE**

### ARCHITECTURE DRIFT

**NO**

### LOW-MAINTENANCE HANDOFF

**PASS**

### CARMEN REQUIRED FOR NORMAL OPERATION

**NO**

### REPLACEMENT DEVELOPER TEST

**PASS** — `./scripts/verify-step-14-3.sh`

### NEW MAINTENANCE BURDEN

**NONE**

### DOES ANY EVENT/OUTBOX FOUNDATION ITEM STILL BLOCK COMMERCIAL?

**NO**

### WHAT COMMERCIAL IS STILL WAITING ON

- **Agent 2 / Step 15.1:** Projection/query gate completion

### EXACT NEXT ACTION

Wait for Agent 2 Step 15.1 PASS; then Lane G Commercial command foundation.

### EXACT NEXT CURSOR PROMPT

```
STEP 15.1 / LANE F — Complete projection + query gate verification (Agent 2 scope)

Read docs/architecture/STEP_15_QUERY_PROJECTION_IMPLEMENTATION_EVIDENCE.md.
Fix build/test blockers, run full projection integration suite, update evidence register.
Do NOT modify OutboxRecoveryService or Step 14.3 recovery wiring unless CROSS_LANE_CHANGE_REQUEST.
```
