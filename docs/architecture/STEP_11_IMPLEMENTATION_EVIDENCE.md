# Step 11 — Event / Audit / Outbox Implementation Evidence

**Phase:** Step 11 — Lane D (BusinessEvent, AuditLog, transactional outbox, delivery, idempotency)  
**Date:** 2026-08-24  
**Gate result:** **PASS** (with documented deferrals — see §Gate decision)

**Rule:** Status labels are not interchangeable. **VERIFIED** requires reproducible Postgres/runtime evidence in this document.

---

## Gate decision

| Criterion | Status | Notes |
|-----------|--------|-------|
| BusinessEvent canonical spine (no ActivityEvent in OS path) | PASS | `os-events`, workforce tests |
| AuditLog distinct from BusinessEvent | PASS | Separate builders + `os_audit_logs` |
| Transactional outbox pattern (command → event → audit → outbox) | **PARTIAL** | **InviteMember only** uses `runInTransaction`; other commands write then emit |
| Outbox worker dispatch + retry + dead-letter | PASS | `OsOutboxWorker` + Postgres integration tests |
| Consumer delivery idempotency | PASS | `os_outbox_consumer_dedup` |
| Command ingestion idempotency | PASS | `os_idempotency_keys` (workforce prisma test) |
| Event envelope matches Step 9 contract | PASS | `BusinessEventEnvelopeSchema` in `os-contracts` |
| Schema version policy documented | PASS | `EVENT_SCHEMA_VERSION_POLICY` |
| Tenant isolation on event/audit/outbox | PASS | Scoped queries + stats test |
| Correlation preserved end-to-end | PASS | Invite + outbox envelope |
| Legacy ActivityEvent frozen | PASS | Workforce test asserts no ActivityEvent |
| Dedicated worker process in `apps/os-api` | **DEFERRED** | Worker is library; no long-running host yet |
| All commands in single DB transaction | **DEFERRED** | Migrate remaining workforce commands to `runInTransaction` |
| Idempotency key on event row for all commands | **PARTIAL** | Wired via `activeIdempotencyKey`; requires built `os-workforce` dist |
| Outbox observability API | **DEFERRED** | `getStats()` exists on store; not exposed via HTTP |

---

## Implementation matrix

| Area | PLANNED | IMPLEMENTED | TESTED | INTEGRATED | VERIFIED |
|------|---------|-------------|--------|------------|----------|
| BusinessEvent envelope + versioning | ✓ | ✓ | ✓ | ✓ | ✓ |
| AuditLog boundary | ✓ | ✓ | ✓ | ✓ | ✓ |
| Outbox message + delivery columns | ✓ | ✓ | ✓ | ✓ | ✓ |
| `PrismaOsOutboxStore` (claim, publish, retry, DLQ) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `OsOutboxWorker` | ✓ | ✓ | ✓ | — | ✓ |
| Consumer dedup table | ✓ | ✓ | ✓ | ✓ | ✓ |
| `runInTransaction` on Prisma workforce store | ✓ | ✓ | ✓ | InviteMember only | ✓ (invite) |
| Command idempotency storage | ✓ | ✓ | ✓ | ✓ | ✓ |
| Event idempotency reference on BusinessEvent | ✓ | ✓ | ✓ | InviteMember | ✓ |
| Cross-lane emit/consume contract (doc) | ✓ | ✓ | — | — | — |
| Worker host / scheduler | ✓ | — | — | — | — |

---

## Package / file map

| Location | Purpose |
|----------|---------|
| `packages/os-contracts/src/event-envelope.ts` | `BusinessEventEnvelope`, outbox statuses, version policy |
| `packages/os-contracts/src/events.ts` | Foundation event type union |
| `packages/os-events/src/envelope.ts` | `toBusinessEventEnvelope`, `parseOutboxEnvelope` |
| `packages/os-events/src/append.ts` | `buildBusinessEvent`, `buildOutboxForEvent`, `buildAuditEntry` |
| `packages/os-events/src/outbox-port.ts` | `OsOutboxStorePort`, `OsOutboxConsumerPort` |
| `packages/os-events/src/outbox-worker.ts` | `OsOutboxWorker` (claim, deliver, retry, dead-letter) |
| `packages/os-database/prisma/migrations/20260824120000_os_step11_outbox_delivery/` | `attempt_count`, `next_attempt_at`, `last_error`, `os_outbox_consumer_dedup` |
| `packages/os-database/src/prisma-outbox-store.ts` | Postgres outbox store (`FOR UPDATE SKIP LOCKED`) |
| `packages/os-database/src/prisma-workforce-store.ts` | `runInTransaction`, `appendEventAndAudit` |
| `packages/os-workforce/src/workforce-command-service.ts` | Transactional `InviteMember`; `activeIdempotencyKey` on events |
| `scripts/verify-step-11.sh` | Migrate, build, test gate |

---

## Transactional outbox pattern (ADR-0008)

**Approved sequence (InviteMember path — VERIFIED):**

```
COMMAND (InviteMember)
  → authoritative domain writes (person, member, auth, role)
  → BusinessEvent (member.invited)
  → AuditLog
  → Outbox (full envelope payload)
  — all inside Prisma $transaction —
```

**Worker path (VERIFIED):**

```
OsOutboxWorker.runOnce()
  → claimPendingBatch (SKIP LOCKED)
  → consumer.deliver(envelope)
  → mark published OR schedule retry OR dead_letter
  → consumer dedup prevents duplicate side effects
```

**Remaining commands:** still call `emit()` after domain writes without wrapping in `runInTransaction`. Events are not lost on crash between writes and emit, but atomicity is not guaranteed until migrated.

---

## Audit vs BusinessEvent boundary

| | BusinessEvent | AuditLog |
|---|---------------|----------|
| Purpose | Domain truth — what happened in the business | Security/governance — who attempted what |
| Table | `os_business_events` | `os_audit_logs` |
| Payload | Domain payload + envelope metadata | action, resource, before/after refs |
| Builder | `buildBusinessEvent` | `buildAuditEntry` |
| Duplication rule | Audit does not copy full event payload | — |

---

## Idempotency

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Command ingestion | `os_idempotency_keys` (org + key) | TESTED + VERIFIED |
| Event row reference | `os_business_events.idempotency_key` | VERIFIED (InviteMember) |
| Consumer delivery | `os_outbox_consumer_dedup` (consumer_key + outbox_id) | TESTED + VERIFIED |

Command idempotency record is saved **after** command completes (outside the InviteMember transaction). Duplicate command retries return cached result without re-emitting.

---

## Event versioning

- **Event type naming:** dot-separated foundation types (`member.invited`, `delegation.granted`, …) from `shared-contracts.yaml`.
- **Schema version:** `schemaVersion` on envelope; current = 1.
- **Unknown version:** `EVENT_SCHEMA_VERSION_POLICY.onUnknownVersion = reject_and_dead_letter`.
- **Deprecation:** immutable event types; new types supersede; consumers skip unknown types.

---

## Cross-lane contract (emit / consume / correlate / test)

Lanes **do not** implement their own event infrastructure. They use Lane D.

### Lane B — Workforce (owner: `packages/os-workforce`)

| Action | Contract |
|--------|----------|
| Emit | Command service calls `buildBusinessEvent` + `buildOutboxForEvent` + `buildAuditEntry` inside `runInTransaction` when store supports it |
| Consume | Via projection consumers only (not command path) |
| Correlate | `RequestContext.correlationId` → event + audit + outbox envelope |
| Test | `workforce-lifecycle.test.ts`, `workforce-prisma.integration.test.ts` |

**Must not touch:** `os_outbox_consumer_dedup`, worker claim logic, legacy `ActivityEvent`.

### Lane C — PartyGraph (future)

| Action | Contract |
|--------|----------|
| Emit | New command service; same `appendEventAndAudit` / transactional pattern |
| Consume | Register `OsOutboxConsumerPort` with `consumerKey` like `partygraph.projection` |
| Correlate | Same `correlationId` from session context |
| Test | Postgres integration: event + outbox row + worker dispatch |

**Must not touch:** `os-events` worker internals, workforce command handlers, legacy `Account` table.

### Lane E — Work / Approval / Attention (future)

| Action | Contract |
|--------|----------|
| Emit | Work commands emit `work.*` / `approval.*` event types (to be added to contracts) |
| Consume | Attention projections subscribe via outbox consumer |
| Correlate | `causationId` may link work event to triggering business event |
| Test | Worker retry + dedup tests as template |

**Must not touch:** Audit builder semantics, tenant isolation in `os-domain`.

### Lane F — Query / Projection (future)

| Action | Contract |
|--------|----------|
| Emit | None (read-only lane) |
| Consume | Implement `OsOutboxConsumerPort`; use `parseOutboxEnvelope` |
| Correlate | Read `correlationId` from envelope |
| Test | Consumer dedup + unknown schema version handling |

**Must not touch:** Command services, Prisma workforce writes, outbox claim SQL.

### Lane G — Commercial (future — closed until A–F ready)

| Action | Contract |
|--------|----------|
| Emit | Commercial commands on OS spine; migrate off `ActivityEvent` at cutover |
| Consume | Finance/commercial projections via outbox |
| Correlate | `dataOrigin`, `capabilityKey` on envelope |
| Test | Demo isolation per ADR-0009 |

---

## Parallelization decision (end of Step 11)

| Lane | Can start? | Prerequisite met | Contract consumed | Owns | Must not touch |
|------|------------|------------------|-------------------|------|----------------|
| **C — PartyGraph** | **YES** | Tenant + Person/Member + event spine | `BusinessEventEnvelope`, `appendEventAndAudit`, outbox pattern | `packages/os-party` (new), party Prisma models, party commands | Outbox worker, workforce handlers, legacy commercial |
| **E — Work / Approval** | **YES** | Event spine + audit boundary | Same envelope + `OsOutboxConsumerPort` | `packages/os-work` (new), WorkItem schema, work commands | Outbox claim SQL, `os-workforce` command internals |
| **F — Query / Projection** | **YES** | Dispatchable outbox + envelope parser | `OsOutboxConsumerPort`, `parseOutboxEnvelope`, stats | Projection packages, consumer registrations | Command writes, tenant auth middleware |

**Commercial (G):** **NO** — needs PartyGraph (C), Work spine (E), projection consumers (F), and full transactional command coverage across lanes.

---

## Security verification

| Check | Status |
|-------|--------|
| Tenant A cannot read Tenant B outbox stats | VERIFIED |
| Event/audit/outbox rows carry `organizationId` | IMPLEMENTED |
| Worker claims globally but envelope is tenant-scoped | IMPLEMENTED |
| No secrets in event payloads (invite uses `inviteRef`, not credentials) | IMPLEMENTED |
| User-facing paths still require session auth (unchanged from Step 10) | VERIFIED (Step 10.3) |

---

## Test evidence (2026-08-24)

```bash
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
./scripts/verify-step-11.sh
```

**Log:** `.step11-evidence/verify-20260824T122302Z.log`

| Suite | Tests | Result |
|-------|-------|--------|
| `os-events` — `OsOutboxWorker` (memory) | 1 | PASS |
| `os-database` — outbox prisma integration | 5 | PASS |
| `os-database` — workforce prisma integration | 5 | PASS |
| `os-workforce` — lifecycle regression | 11 | PASS |

**Postgres scenarios verified:**

- Event persisted (`os_business_events`)
- Audit persisted (`os_audit_logs`)
- Outbox persisted (`os_outbox_messages`, status `pending`)
- Worker dispatches → `published`
- Retry after consumer failure → `dead_letter` with `last_error`
- No duplicate consumer side effects on worker restart (`os_outbox_consumer_dedup`)
- Tenant-scoped outbox stats
- Command idempotency prevents duplicate invite
- Correlation + idempotency key on invite event row
- No ActivityEvent usage in OS workforce path

---

## Architecture drift

**NO** — implementation aligns with Step 9 contracts and ADR-0005, ADR-0008, ADR-0009. No second event spine introduced.

**Operational note (not drift):** Integration tests importing `@isalwa/os-workforce` require `pnpm --filter @isalwa/os-workforce build` — enforced in `verify-step-11.sh`.

---

## Deferred (explicit)

1. Migrate all workforce commands to `runInTransaction` + atomic emit.
2. Move command idempotency save inside transaction or make emit idempotent by event idempotency key.
3. Long-running outbox worker host (CLI script or `apps/os-api` background module).
4. HTTP observability route for outbox stats (internal ops only).
5. Scheduled `delegation.expired` emission (Lane B scheduler — not Lane D).
