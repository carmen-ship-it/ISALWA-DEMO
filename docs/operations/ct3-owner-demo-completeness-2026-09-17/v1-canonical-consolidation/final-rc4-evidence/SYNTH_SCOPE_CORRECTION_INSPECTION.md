# SYNTH membership scope-correct — INSPECT ONLY (not executed)

**Status:** SYNTH_SCOPE_CORRECTION_EXECUTED = NO  
**Carmen must separately authorize** before any staging run.  
**Runtime inspected:** 2026-09-17 after RC4 hosted deploy.

## Identity (runtime-confirmed)

| Field | Value |
|-------|--------|
| SCRIPT_PATH | `packages/os-database/src/staging-carmen-synth-demo-membership-scope-correct.ts` |
| TARGET_ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| TARGET_ACTOR | `carmen.staging@isalwa.demo` |
| TARGET_DATA_MODE | SYNTH / Demo |
| SYNTH_MEMBERSHIP_ID | `0f3da8a7-6d31-4e36-8f45-41331e6f5731` |
| PRECHANGE_SNAPSHOT | `/tmp/rc4-synth-scope-prechange-snapshot.json` |
| ROLLBACK_PLAN | `/tmp/rc4-synth-scope-rollback-plan.json` |

## Exact scope diff (runtime)

CURRENT_SCOPES_EXACT already equals PROPOSED_SCOPES_EXACT (20 keys).  
Correction script dry-run is a **NOOP** (0 ends, 0 creates).

### CURRENT_SCOPES_EXACT / PROPOSED_SCOPES_EXACT / UNCHANGED_SCOPES

```
commercial.account.reassign
commercial.customer.create
commercial.order.convert
commercial.org.read
commercial.price.approve
commercial.quote.convert.own
commercial.team.read
coordination.decision.record
delivery.record
finance.operational.record
issue.manage
management.org.read
operations.coordinator.record
production.entry.member
production.operational.record
production.review.member
purchasing.operational.record
warehouse.finished_goods.allocate
warehouse.finished_goods.receive
warehouse.outbound.record
```

| Diff set | Exact keys |
|----------|------------|
| ADDED_SCOPES_EXACT | _(empty)_ |
| REMOVED_SCOPES_EXACT | _(empty)_ |

### Historical ended (already inactive; not active now)

Ended 2026-09-17 12:02:33 UTC on this membership only:

- `master_data.admin`
- `people.admin`
- `qa.access`

Active forbidden count now: **0**. After correction (noop): **0**.

## Forbidden after correction

FORBIDDEN_SCOPE_AFTER_CORRECTION = 0

## Owner-eval coverage

OWNER_EVAL_V1_BUSINESS_COVERAGE = **COMPLETE** against approved `OWNER_DEMO_SYNTH_BUSINESS_SCOPES` (no new invented capabilities).

Maps to: commercial, Pedido, Work/ops, Approvals (`commercial.price.approve`), Issues (`issue.manage`), Commitments/coordination (`coordination.decision.record`), Conversations (membership + existing commercial/ops scopes; no dedicated conversation.* key in product), Production, Warehouse, Purchasing review, Delivery, Finance operational, Management, Documents/History/Audit (`management.org.read` + `commercial.org.read`).

## Rollback (prepared, not run)

| Field | Value |
|-------|--------|
| PRECHANGE_SCOPE_SNAPSHOT_SAVED | YES |
| ROLLBACK_METHOD | BOUNDED_RESTORE_VIA_ROLE_ASSIGNMENTS (membership_id only; end extras; create missing snapshot keys) |
| ROLLBACK_TARGET_SCOPES | Exact CURRENT_SCOPES_EXACT above |
| ROLLBACK_TESTED_DRY_RUN | YES (would_end=0, would_create=0) |
| SCRIPT_REVERSIBLE (original note) | NO as a dedicated reverse file — superseded by bounded restore against snapshot |

## Dry-run boundary

| Flag | Value |
|------|--------|
| TARGET_MEMBERSHIPS_COUNT | 1 |
| TARGET_ORG | 01M2JKF77TXMJNDTKNCYNHH9G5 |
| TARGET_ACTOR | carmen.staging@isalwa.demo |
| REAL_MEMBERSHIPS_TOUCHED | 0 |
| OTHER_SYNTH_MEMBERSHIPS_TOUCHED | 0 |
| PROTECTED_REAL_CLIENTS_TOUCHED | 0 |
| BUSINESS_DATA_ROWS_TOUCHED | 0 |
| ROLE_ASSIGNMENT_ROWS_WOULD_END | 0 |
| ROLE_ASSIGNMENT_ROWS_WOULD_CREATE | 0 |

## Execution gate

| Flag | Value |
|------|--------|
| SYNTH_SCOPE_CORRECTION_SAFE_TO_EXECUTE | YES (idempotent NOOP; boundary clean) |
| SYNTH_SCOPE_CORRECTION_EXECUTED | NO |
| Authorization | Still required from Carmen before any run |
