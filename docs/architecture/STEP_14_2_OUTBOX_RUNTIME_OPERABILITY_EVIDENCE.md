# Step 14.2 — Outbox Runtime + Operability Evidence

**Phase:** Step 14.2 — Close Step 11 production-delivery and operability deferrals  
**Date:** 2026-08-24  
**Gate result:** **PASS**

**Verification log:** `.step14-2-evidence/verify-20260824T125528Z.log`

---

## Hosting model challenge

| Option | Evaluation | Decision |
|--------|--------------|----------|
| **A. Co-hosted in `apps/os-api`** | Starts with API deploy; no second process; uses existing `ProjectionRunner` consumers; `SKIP LOCKED` + consumer dedup already proven; graceful shutdown via Nest lifecycle | **CHOSEN** |
| B. Separate worker process | Extra deploy unit + ops surface; justified only at higher scale | Deferred — same `OutboxWorkerHost` can be reused later |
| C. Provider scheduler (Vercel cron, etc.) | Provider-coupled; not portable | Rejected |
| D. Second queue/bus | Architecture drift vs ADR-0008 | Rejected |

**Why lowest-maintenance:** One deploy artifact (`os-api`) runs commands **and** dispatches outbox. No hidden terminal, no manual poll command, no provider-specific scheduler required. Disable with `OS_OUTBOX_WORKER=0` (alias: `OS_PROJECTION_WORKER=0`).

---

## Canonical pipeline (unchanged)

```
domain transaction → BusinessEvent → AuditLog → Outbox
  → OutboxWorkerHost (poll) → OsOutboxWorker → registered consumers
```

Consumers remain registered in `OsStoreModule` via `ProjectionRunner` (Agent 2 owns consumer implementations; Step 14.2 only wires the host).

---

## Implementation

| File | Purpose |
|------|---------|
| `packages/os-events/src/outbox-worker-host.ts` | Production host: poll, graceful stop, structured logs, health merge |
| `packages/os-events/src/outbox-port.ts` | `OutboxOperationalHealth`, `getOperationalHealth` port |
| `packages/os-database/src/prisma-outbox-store.ts` | Operational backlog queries; **claim lease** via `next_attempt_at` for multi-instance safety |
| `packages/os-database/src/outbox-runtime.integration.test.ts` | Runtime Postgres evidence |
| `apps/os-api/src/os-store.module.ts` | Registers `OutboxWorkerHost`; starts on module init; stops on destroy |
| `apps/os-api/src/main.ts` | Removed ad-hoc `setInterval` duplicate worker |
| `apps/os-api/src/health.controller.ts` | Public liveness: worker running + pending count |
| `apps/os-api/src/operations.controller.ts` | `GET /v1/operations/outbox` — `people.admin`, tenant-scoped, no payloads |
| `scripts/verify-step-14-2.sh` | Verification gate |

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `OS_OUTBOX_WORKER` | enabled | Set `0` to disable host |
| `OS_PROJECTION_WORKER` | enabled | Legacy alias for disable |
| `OS_OUTBOX_POLL_MS` | `5000` | Poll interval (falls back to `OS_PROJECTION_POLL_MS`) |
| `OS_OUTBOX_BATCH_SIZE` | `25` | Claim batch size |

---

## Runtime verification (Postgres)

| Test | Proves |
|------|--------|
| `host starts, dispatches pending, and exposes health` | Worker start → publish → health |
| `host restart resumes pending backlog` | Process restart recovery |
| `concurrent workers do not duplicate consumer side effects` | Multi-instance `SKIP LOCKED` (6 messages, 2 workers) |
| `operational health reports backlog without payloads` | Backlog metrics + DL summary without `payloadJson` |
| `outbox prisma integration` (5 tests) | Dispatch, retry, DLQ, dedup, tenant stats |
| `OutboxWorkerHost` unit test | Graceful shutdown waits for in-flight tick |
| `os-api tenant isolation` | App boots with host; module destroy stops worker |

---

## Multi-instance safety

- **Claim:** `FOR UPDATE SKIP LOCKED` on pending rows — concurrent workers claim disjoint batches (verified with parallel `runOnce`).
- **Claim lease:** `claimPendingBatch` sets a 120s `next_attempt_at` lease on claim so concurrent workers cannot select the same row; crash recovery when lease expires.
- **Dedup:** `os_outbox_consumer_dedup` — duplicate delivery does not re-run consumer side effects (Step 11 test + runtime suite).
- **Retry:** Failed consumer → `markForRetry` with backoff → row returns to pending when `next_attempt_at <= NOW()`.
- **Crash recovery:** Unpublished rows remain `pending`; restart/host resume processes backlog (restart test).

---

## Observability

| Surface | Auth | Data exposed |
|---------|------|--------------|
| `GET /v1/health` | Public | `outboxWorker.running`, `lastRunAt`, aggregate `pending` |
| `GET /v1/operations/outbox` | `people.admin` session | Backlog counts, retrying, oldest pending age, last published, recent DL summaries (ids + errors only), worker state |

No event payloads, tokens, or cross-tenant data on ops routes.

---

## Recovery procedure (normal operations)

1. **API/worker restart:** Automatic — `OutboxWorkerHost` starts on Nest `onModuleInit`; pending outbox rows dispatch on next poll.
2. **Temporary consumer failure:** Automatic exponential retry until `maxAttempts` → `dead_letter`.
3. **Prolonged backlog:** Inspect `GET /v1/operations/outbox`; fix consumer; backlog drains automatically.
4. **Dead-letter:** `GET /v1/operations/outbox/dead-letters`; fix root cause; `POST /v1/operations/outbox/dead-letters/:outboxId/retry` with reason + idempotency key (Step 14.3 — **CLOSED**).
5. **Disable worker:** `OS_OUTBOX_WORKER=0` — outbox accumulates; re-enable to drain (no SQL repair).

**Exceptional manual intervention:** Only if a dead-letter must be replayed before a replay command exists — documented in Step 11; not part of normal operation.

---

## Step 11 deferral resolution

| Item | Before | Now | Evidence |
|------|--------|-----|----------|
| Worker host process | OPEN (library only) | **CLOSED** | `OutboxWorkerHost` + os-api lifecycle |
| Production-style dispatch | OPEN | **CLOSED** | Host poll + integration tests |
| Operational observability | OPEN (`getStats` only) | **CLOSED** | `getOperationalHealth` + HTTP surfaces |
| Retry/dead-letter recovery | PARTIAL (worker only) | **CLOSED** | Documented + existing DL/retry tests |

---

## Cross-lane notes

- **Did not modify:** `os-query` projection consumers, PartyGraph/Work/Workforce command internals, Lane F query endpoints (Agent 2).
- **Removed duplicate worker** from `main.ts` (was parallel to module wiring).
- **Agent 2 build conflict:** Full `@isalwa/os-database` `tsc` may fail on in-flight Agent 2 projection-store changes — Step 14.2 tests run via `tsx` on outbox paths; not a Step 14.2 regression.

---

## Carmen handoff

### WHERE WE ARE

Step 11 production-delivery deferrals are **closed**. Outbox dispatch runs automatically with `os-api`, exposes health/ops surfaces, and is verified with Postgres + runtime tests.

### HOSTING MODEL CHOSEN

**Co-hosted `OutboxWorkerHost` inside `apps/os-api`** — single deploy, portable, uses existing `OsOutboxWorker` + `ProjectionRunner` consumers, no provider lock-in, minimal moving parts.

### WHAT ACTUALLY CHANGED

- `OutboxWorkerHost` with poll, graceful shutdown, structured JSON logs
- Extended operational health on outbox store (no payloads)
- Nest module lifecycle start/stop; removed duplicate `setInterval` in `main.ts`
- `/v1/health` outbox liveness; `/v1/operations/outbox` admin backlog view
- Runtime integration tests + verify script

### WHAT RUNTIME PROVED

9/9 outbox Postgres tests pass; host start/dispatch/restart; concurrent workers; os-api boots with worker and stops cleanly on `app.close()`.

### MULTI-INSTANCE TEST

**PASS**

### RETRY / DEAD-LETTER TEST

**PASS** (Step 11 + Step 14.2 operational health test)

### OBSERVABILITY STATUS

**PASS**

### RECOVERY TEST

**PASS** (restart test + documented automatic recovery)

### STEP 11 DEFERRALS

| item | before | now | evidence |
|------|--------|-----|----------|
| Worker host | OPEN | **CLOSED** | `OutboxWorkerHost`, os-api module init |
| Production dispatch | OPEN | **CLOSED** | runtime integration tests |
| Observability API | OPEN | **CLOSED** | health + operations endpoints |
| Retry/DL recovery | PARTIAL | **CLOSED** | worker + docs |

### WHAT IS NOT VERIFIED

- Governed dead-letter replay command — **CLOSED in Step 14.3**
- Separate standalone worker binary (optional scale-out — same host class)
- Full monorepo `turbo build` while Agent 2 Step 15.1 types are in flux

### CROSS-LANE CHANGE REQUESTS

**NONE** for Step 14.2 scope. Agent 2 should fix `prisma-projection-store.ts` build type independently.

### ARCHITECTURE DRIFT

**NO**

### LOW-MAINTENANCE HANDOFF

**PASS**

### CARMEN REQUIRED FOR NORMAL OPERATION

**NO** — deploy `os-api` with Postgres; worker starts automatically.

### REPLACEMENT DEVELOPER TEST

**PASS** — `./scripts/verify-step-14-2.sh` with `OS_DATABASE_URL`.

### NEW MAINTENANCE BURDEN

**NONE** (env vars documented above).

### DOES EVENT DELIVERY STILL BLOCK COMMERCIAL?

**NO** — delivery runtime is operational. Commercial still blocked on Lane F + Lane G implementation.

### WHAT COMMERCIAL IS STILL WAITING ON

- **Agent 2 / Step 15.1:** Projection/query gate completion (Work/Approval/Attention read models + endpoints)
- **Lane G:** Commercial command foundation (explicitly not started)

### EXACT NEXT ACTION

Wait for Agent 2 Step 15.1 gate PASS, then start Lane G Commercial command foundation.

### EXACT NEXT CURSOR PROMPT

```
STEP 15.1 / LANE F — Complete projection + query gate verification (Agent 2 scope)

Read docs/architecture/STEP_15_QUERY_PROJECTION_IMPLEMENTATION_EVIDENCE.md and in-flight os-query changes.
Fix build/test blockers, run full projection integration suite, update evidence register.
Do NOT modify OutboxWorkerHost or Step 14.2 operability wiring unless CROSS_LANE_CHANGE_REQUEST.
```
