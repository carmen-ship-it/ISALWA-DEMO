# Step 14.4 — Approval Security + Integrity Remediation Evidence

**Phase:** Step 14.4 — Lane E remediation (E-01, E-02, E-03)  
**Date:** 2026-08-24  
**Gate result:** **PASS** (remediation evidence ready for Agent 3 re-review)

**Verification log:** `.step14-4-evidence/verify-20260824T131833Z.log`

---

## Independent review findings (remediation status)

| Finding | Description | Remediation status | Evidence |
|---------|-------------|-------------------|----------|
| **E-01** | Unconstrained `RequestApproval.subjectType`; only `party` existence checked | **CLOSED** (pending Agent 3 re-review) | `APPROVAL_SUBJECT_TYPES` enum; `validateApprovalSubject()`; 17 postgres tests |
| **E-02** | Concurrent Approve vs Reject not safe (read-then-write race) | **CLOSED** (pending Agent 3 re-review) | `decidePendingApprovalRequest` conditional `updateMany WHERE status='pending'`; concurrent test |
| **E-03** | `contextSnapshot` copied into BusinessEvent/outbox payload | **CLOSED** (pending Agent 3 re-review) | Bounded row snapshot only; events use canonical payloads via `buildApprovalDecisionEventPayload()` |

**Note:** Status above reflects **remediation evidence**, not an independent re-verdict. Agent 3 must re-check against this log and source.

---

## What changed

| File | Change |
|------|--------|
| `packages/os-contracts/src/work-events.ts` | `APPROVAL_SUBJECT_TYPES` (`party`, `organization_member`, `work_item`); `APPROVAL_SUBJECT_TYPES_BLOCKED` (`commercial_account`) |
| `packages/os-contracts/src/work-commands.ts` | `RequestApprovalPayloadSchema.subjectType` → `z.enum(APPROVAL_SUBJECT_TYPES)`; bounded `ApprovalRequestContextSchema` (`note` max 500, strict) |
| `packages/os-work/src/approval-subjects.ts` | **NEW** — `validateApprovalSubject()`, `buildApprovalDecisionEventPayload()` |
| `packages/os-work/src/work-command-service.ts` | Subject validation on request; bounded context on row only; safe decision event payloads; shared `decideApproval()` path with `CONFLICT` |
| `packages/os-work/src/os-work-store.ts` | `decidePendingApprovalRequest()` replaces unconditional update |
| `packages/os-database/src/prisma-work-store.ts` | `updateMany WHERE status='pending'`; `testFailNextAppend` hook for rollback test |
| `packages/os-database/src/approval-security-prisma.integration.test.ts` | **NEW** — 17 postgres security/integrity tests |
| `scripts/verify-step-14-4.sh` | **NEW** — build + approval security + work regression |

**Not modified (parallel safety):** `packages/os-commercial`, `packages/os-query`, `apps/os-web`, outbox worker architecture.

---

## Governed approval subject types

### Safe now (enabled)

| Subject type | Existence check | Tenant check | Lifecycle rule |
|--------------|-----------------|--------------|------------------|
| `party` | `partyExistsInOrg(orgId, subjectId)` | implicit in query | party must exist in org |
| `organization_member` | `getMemberInOrg` | implicit in query | `accessStatus === 'active'` |
| `work_item` | `getWorkItemInOrg` | implicit in query | `status === 'open'` |

### Not enabled (require explicit extension)

| Subject type | Reason |
|--------------|--------|
| `commercial_account` | Listed in `APPROVAL_SUBJECT_TYPES_BLOCKED`; not in approval enum |
| `quote`, `order`, `opportunity` | Not in contract; Commercial must not wire until extension |
| Any arbitrary string | Rejected at Zod validation (`VALIDATION_FAILED`) |

---

## Future extension process (adding a new approval subject)

1. **Add explicit subject type** to `APPROVAL_SUBJECT_TYPES` in `packages/os-contracts/src/work-events.ts` (never `z.string()`).
2. **Register validator** in `validateApprovalSubject()` switch — dedicated existence + tenant + lifecycle checks per type. No dynamic table names or generic SQL lookup.
3. **Prove tenant ownership** — every validator must scope by `organizationId`.
4. **Define lifecycle rules** — document which states are approvable (e.g. open work item, active member).
5. **Add postgres tests** in `approval-security-prisma.integration.test.ts` — allowed, nonexistent, cross-tenant, blocked lifecycle.
6. **Update evidence** — this doc + `ARCHITECTURE_EVIDENCE_REGISTER.md` + ADR note if cross-lane.

---

## Event payload safety (E-03)

### Why `contextSnapshot` exists

`contextSnapshotJson` on `os_approval_requests` stores **bounded operator context** for immutable request history on the authoritative row only. It is **not** copied into BusinessEvent or outbox payloads.

Bounded fields stored on row:
- optional `note` (max 500 chars)
- `requestedAt`, `requestedByMemberId`, `approverMemberId`, `workItemId`, `subjectType`, `subjectId` (system-derived)

### Exact approval event payloads (canonical)

**`approval.requested`:**
- `approvalRequestId`
- `approverMemberId`
- `workItemId` (nullable)
- `subjectType`
- `subjectId`

**`approval.approved` / `approval.rejected`:**
- `approvalRequestId`
- `subjectType`
- `subjectId`
- `requestedByMemberId`
- `approverMemberId`
- `decision` (`approved` | `rejected`)
- `decisionByMemberId`
- `decidedAt` (ISO string)
- `reason` (optional, max 500 chars on approve; required on reject)

**Excluded from all approval events:** `contextSnapshot`, arbitrary request body, secrets, tokens, unbounded nested JSON, copied business records.

---

## Concurrent decision integrity (E-02)

Pattern: `decidePendingApprovalRequest` uses Postgres `UPDATE ... WHERE status = 'pending'`. Only one terminal decision wins; loser gets `CONFLICT`.

Invariants:
- `pending` → exactly one of `approved` | `rejected`
- Decision fields immutable after terminal state
- Duplicate `Approve` with same idempotency key remains idempotent (existing Step 14 pattern)

---

## Postgres verification (17/17 pass)

| # | Test | Proves |
|---|------|--------|
| 1 | accepts allowed party subject | E-01 happy path |
| 2 | rejects unknown subject type | E-01 fail closed |
| 3 | rejects blocked commercial_account | Commercial not auto-enabled |
| 4 | rejects nonexistent party subject | E-01 existence |
| 5 | rejects cross-tenant party subject | E-01 tenant |
| 6 | RequestApproval event bounded, no malicious context | E-03 request event |
| 7 | rejects free-form context keys | E-03 validation |
| 8 | approve emits safe bounded decision payload | E-03 decision event |
| 9 | reject succeeds on separate approval | Reject path |
| 10 | concurrent approve vs reject → one wins | E-02 |
| 11 | second terminal decision returns CONFLICT | E-02 + immutability |
| 12 | duplicate Approve idempotent | Idempotency |
| 13 | rejects expired delegation | Authorization |
| 14 | rejects unauthorized member | Authorization (`PERMISSION_DENIED`) |
| 15 | rejects suspended approver | Authorization (`ACCESS_REVOKED`) |
| 16 | rejects cross-tenant approval decision | Tenant isolation |
| 17 | rolls back decision when outbox append fails | Atomic tx |

**Work regression:** 7/7 pass (unchanged Step 14 behavior).

**Verify:** `./scripts/verify-step-14-4.sh`

---

## Commercial integration gate

Commercial core (`packages/os-commercial`) does **not** call Approval. Quote/order/opportunity subjects are **not** in `APPROVAL_SUBJECT_TYPES`.

**Commercial → Approval integration remains BLOCKED** until an explicit subject-type extension follows the process above.

---

## Carmen handoff

### WHERE WE ARE

Step 14.4 closes E-01, E-02, and E-03 with real Postgres evidence. Lane E Step 14 overall remains **CONDITIONAL PASS** until Agent 3 independently re-reviews this remediation.

### E-01 SUBJECT VALIDATION

**PASS** (remediation complete; pending independent re-review)

### SAFE APPROVAL SUBJECT TYPES NOW

`party`, `organization_member`, `work_item`

### FUTURE SUBJECT TYPES NOT YET ENABLED

`commercial_account` (explicitly blocked), `quote`, `order`, `opportunity`, and any string outside `APPROVAL_SUBJECT_TYPES`

### E-03 EVENT PAYLOAD SAFETY

**PASS** (remediation complete; pending independent re-review)

### EXACT APPROVAL EVENT PAYLOAD NOW

**approval.requested:** `approvalRequestId`, `approverMemberId`, `workItemId`, `subjectType`, `subjectId`

**approval.approved / approval.rejected:** `approvalRequestId`, `subjectType`, `subjectId`, `requestedByMemberId`, `approverMemberId`, `decision`, `decisionByMemberId`, `decidedAt`, optional `reason`

### CONCURRENT APPROVE / REJECT

**PASS** — conditional DB update; exactly one terminal decision in concurrent test

### IMMUTABLE DECISION TEST

**PASS** — second Approve/Reject returns `CONFLICT`; decision fields not overwritten

### AUTHORIZATION NEGATIVE TESTS

| Case | Result |
|------|--------|
| Unauthorized outsider | `PERMISSION_DENIED` |
| Expired delegation | `PERMISSION_DENIED` |
| Suspended approver | `ACCESS_REVOKED` |
| Cross-tenant decision | `NOT_FOUND` |

### TRANSACTION / ROLLBACK

**PASS** — `testFailNextAppend` proves approval row stays `pending` when outbox append fails

### WHAT POSTGRES PROVED

17 approval-security tests + 7 work regression tests; BusinessEvent and outbox payloads inspected directly in assertions; log at `.step14-4-evidence/verify-20260824T131833Z.log`

### WHAT IS NOT VERIFIED

- HTTP-level tenant isolation for all work commands (pre-existing E gap in ACTIVE_LANES_REVIEW)
- `organization_member` and `work_item` subject happy paths in dedicated tests (validators implemented; party path fully exercised)
- Suspend/open-work policy (E-04, separate deferred item)
- Agent 3 independent re-verdict on Lane E gate

### CROSS-LANE CHANGE REQUESTS

None. No changes to Commercial, os-query, os-web, or outbox worker.

### ARCHITECTURE DRIFT

**NO** — extends existing Lane E pattern; no parallel approval mechanism; no policy engine.

### LOW-MAINTENANCE HANDOFF

**PASS** — subject registry, extension process, event payload contract, and verify script documented in this file and source.

### CARMEN-DISAPPEARANCE TEST

**PASS** — replacement developer can run `./scripts/verify-step-14-4.sh`, read `approval-subjects.ts`, and determine valid subjects without tribal knowledge.

### DOES APPROVAL STILL BLOCK COMMERCIAL INTEGRATION?

**YES** — Commercial core is safe; Commercial→Approval wiring for quote/order/account subjects remains blocked until explicit subject extension.

### EXACT REVIEW REQUEST FOR AGENT 3

Re-run `./scripts/verify-step-14-4.sh` and independently confirm:

1. `RequestApprovalPayloadSchema.subjectType` is `z.enum(APPROVAL_SUBJECT_TYPES)` — not `z.string()`.
2. Unknown/blocked subject types fail at validation without DB side effects.
3. `validateApprovalSubject()` enforces tenant + existence + lifecycle per type.
4. `approval.requested` / `approval.approved` / `approval.rejected` BusinessEvent and outbox payloads contain **only** the canonical fields listed above — no `contextSnapshot`.
5. Concurrent Approve+Reject: exactly one succeeds, one returns `CONFLICT`; row is terminal not pending.
6. Authorization negatives: expired delegation, outsider, suspended approver, cross-tenant.
7. Outbox append failure rolls back terminal decision (row stays pending).
8. Work regression suite still passes.

Update `ACTIVE_LANES_REVIEW.md` E-01/E-02/E-03 status and Lane E gate if findings are confirmed closed.

### EXACT NEXT ACTION

Agent 3 independent re-review of Step 14.4 evidence and verify log.

### EXACT NEXT CURSOR PROMPT

```
STEP 14.4 INDEPENDENT RE-REVIEW — Lane E Approval remediation

Read:
- docs/architecture/STEP_14_4_APPROVAL_SECURITY_INTEGRITY_EVIDENCE.md
- docs/architecture/ACTIVE_LANES_REVIEW.md (E-01, E-02, E-03)
- .step14-4-evidence/verify-20260824T131833Z.log

Run: ./scripts/verify-step-14-4.sh

Independently verify E-01/E-02/E-03 closure. Update ACTIVE_LANES_REVIEW.md finding status and Lane E gate. Do not modify implementation unless a regression is found.
```
