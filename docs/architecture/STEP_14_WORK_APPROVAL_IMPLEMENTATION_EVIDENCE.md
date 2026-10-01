# Step 14 — Work / Approval / Attention Implementation Evidence

**Phase:** Step 14 — Lane E (WorkItem, ApprovalRequest, workforce lifecycle coupling)  
**Date:** 2026-08-24  
**Gate result:** **PASS** (API + Postgres verified; Attention projection + admin UI deferred)

**Rule:** **VERIFIED** requires reproducible Postgres/runtime evidence.

---

## Pre-implementation audit summary

| Finding | Status |
|---------|--------|
| `OsWorkItem` table (Step 10) — minimal fields | **Extended** in Step 14 |
| `ReassignWork` in workforce (no transactional outbox) | **Moved** to `@isalwa/os-work` |
| `ApprovalRequest` | **Implemented** (`os_approval_requests`) |
| `AttentionItem` | **Not authoritative** — remains projection-only (Lane F) |
| Legacy `Task` / `AttentionItem` in `packages/database` | **Frozen** — not used |
| `packages/os-work` | **Created** |

**Lane E owns:** `packages/os-work`, work/approval commands, `os_work_items` extensions, `os_work_item_ownership_history`, `os_approval_requests`.

**Lane E must not own:** AttentionItem persistence, outbox worker internals, PartyGraph commands, Commercial/Finance.

---

## Gate decision

| Criterion | Status | Notes |
|-----------|--------|-------|
| WorkItem ≠ BusinessEvent ≠ Attention | PASS | ADR-0005 boundary preserved |
| CreateWorkItem / ReassignWork / CompleteWork | PASS | Postgres verified |
| CancelWorkItem | PASS | Implemented (manifest CompleteWork only; cancel in STORAGE_CONTRACT) |
| RequestApproval / Approve / Reject | PASS | Immutable terminal outcome |
| Approval context snapshot at request | PASS | `contextSnapshotJson` |
| Delegation respected at decision time | PASS | `approval.act` scope test |
| No silent auto-approve | PASS | Explicit Approve command only |
| Ownership history | PASS | `os_work_item_ownership_history` |
| Subject reference (Party, member, commercial_account) | PASS | `subjectType` + validation |
| Termination blocked with open work | PASS | Workforce + integration test |
| Explicit reassignment before terminate | PASS | Integration test |
| All commands transactional (event+audit+outbox+idempotency) | PASS | `runInTransaction` on every command |
| Tenant isolation | PASS | Cross-tenant test |
| AttentionItem derived store | **DEFERRED** | Lane F projection |
| Collaborators/watchers | **DEFERRED** | Manifest mentions; not in Step 14 DDL |
| SuspendMember open-work check | **DEFERRED** | TerminateMember enforced; suspend not yet |
| ListOpenWork / GetApproval queries | **DEFERRED** | `GET /v1/work-items/:id` only |
| Admin product UI | **DEFERRED** | API only |

---

## Commands implemented (all transactional)

| Command | Scope | Event |
|---------|-------|-------|
| `CreateWorkItem` | `member_active` | `work.created` |
| `ReassignWork` | `people.admin` | `task.reassigned` |
| `CompleteWork` | `member_active` (owner or admin) | `work.completed` |
| `CancelWorkItem` | `member_active` (owner or admin) | `work.cancelled` |
| `RequestApproval` | `member_active` | `approval.requested` |
| `Approve` | `member_active` (approver or delegate) | `approval.approved` |
| `Reject` | `member_active` (approver or delegate) | `approval.rejected` |

**Cross-lane change:** `ReassignWork` removed from `@isalwa/os-workforce` command surface; now owned by `@isalwa/os-work`.

---

## Schema / migration

**Migration:** `20260824160000_os_step14_work_approval`

| Table | Purpose |
|-------|---------|
| `os_work_items` (extended) | priority, dueAt, description, lifecycle timestamps, createdByMemberId |
| `os_work_item_ownership_history` | Ownership audit trail |
| `os_approval_requests` | Governed approvals with frozen context |

---

## Attention boundary (ADR-0005)

**AttentionItem is NOT implemented as authoritative storage in Lane E.**

Future Lane F will derive AttentionItem from:
- BusinessEvent stream (via outbox consumers)
- Open WorkItems + pending ApprovalRequests (projections)
- Auto-resolve when underlying condition clears

No second task/event system introduced.

---

## Workforce lifecycle coupling

| Event | Behavior | Verified |
|-------|----------|----------|
| TerminateMember with open work | `VALIDATION_FAILED` | YES |
| ReassignWork then TerminateMember | Success | YES |
| Department/manager change | Work stays with owner until explicit ReassignWork | By design |
| Delegation expiry | Approval delegate check uses `effectiveAt` | YES (approve test) |
| Party deactivate/merge | Work subject refs preserved; projection resolves lineage later | Contract-only |

---

## Future lane connections (no redesign required)

| Lane | Connection |
|------|------------|
| Workforce | Terminate checks open work; GrantDelegation enables approval delegate |
| PartyGraph | `subjectType: party` validated against `os_parties` |
| Commercial | `subjectType: commercial_account` reserved; future FK validation |
| Command Center / Attention (F) | Consume `work.*`, `approval.*`, `task.reassigned` from outbox |
| AI | Read authorized projections; never Approve/Reassign via bypass |
| Notifications | Sparse delivery from projections — not every event |

---

## Postgres / runtime verification (2026-08-24)

```bash
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
./scripts/verify-step-14.sh
```

**Log:** `.step14-evidence/verify-20260824T124359Z.log`

| Suite | Tests | Result |
|-------|-------|--------|
| work prisma integration | 7 | PASS |
| partygraph prisma integration | 9 | PASS |
| outbox prisma integration | 5 | PASS |
| workforce prisma integration | 5 | PASS |
| os-workforce unit | 11 | PASS |
| os-api tenant isolation | 2 | PASS |
| **Total** | **39** | **PASS** |

---

## Operational handoff

### Run / verify / recover

```bash
./scripts/verify-step-14.sh   # full Lane E + regression
pnpm --filter @isalwa/os-database migrate:deploy
```

### Failure modes

| Code | Meaning |
|------|---------|
| `VALIDATION_FAILED` | Open work blocks termination; invalid owner; terminal approval |
| `PERMISSION_DENIED` | Not owner/approver/delegate |
| `CONFLICT` | Optimistic version mismatch on work item |
| `TENANT_FORBIDDEN` | Cross-tenant command |

### HANDOFF_GAP

Admin product UI not built — work/approval operations require API until `apps/os-web`.

---

## Architecture drift

**NO** — implements ADR-0005/0008 patterns without duplicate spine.  
**Expected cross-lane change:** `ReassignWork` moved from workforce to work command registry.

---

## Deferred

1. AttentionItem projection engine (Lane F)
2. Collaborators/watchers on WorkItem
3. SuspendMember open-work policy
4. `ListOpenWork`, `GetApproval` query endpoints
5. Blocker subtype (DG-03 follow-up)
