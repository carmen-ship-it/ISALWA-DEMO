# Step 15.1 — Work / Approval / Attention Projection Evidence

**Phase:** Step 15.1 — Lane F completion (Work read side)  
**Date:** 2026-08-24  
**Gate result:** **PASS**

**Rule:** **VERIFIED** requires reproducible Postgres + HTTP runtime evidence.

---

## Pre-implementation — Event contract verification

Lane E event envelopes were inspected in `packages/os-work/src/work-command-service.ts`. **No CROSS_LANE_CHANGE_REQUEST required.**

| Event | Primary entity | Payload sufficient for projection |
|-------|----------------|-----------------------------------|
| `work.created` | `work_item` | `workItemId`, `ownerMemberId`, `title`, `subjectType`, `subjectId` |
| `task.reassigned` | `work_item` | `workItemId`, `newOwnerMemberId`, `previousOwnerMemberId` |
| `work.completed` | `work_item` | `workItemId` |
| `work.cancelled` | `work_item` | `workItemId`, `reason?` |
| `approval.requested` | `approval_request` | `approvalRequestId`, `approverMemberId`, `workItemId`, `subjectType`, `subjectId` |
| `approval.approved` | `approval_request` | `approvalRequestId`, `decisionByMemberId`, `contextSnapshot` |
| `approval.rejected` | `approval_request` | `approvalRequestId`, `decisionByMemberId`, `reason` |

Projections **hydrate from authoritative** `os_work_items` / `os_approval_requests` after each event (same pattern as Party Step 15). Lane E was **not modified**.

---

## Gate decision

| Criterion | Status |
|-----------|--------|
| Work summary projection rebuildable | PASS |
| Approval summary projection rebuildable | PASS |
| AttentionItem derived only (not authoritative) | PASS |
| `ListOpenWork` authorized query | PASS |
| `GetWorkItem` via projection summary | PASS |
| `ListPendingApprovals` | PASS |
| `GetApproval` | PASS |
| `ListAttentionItems` | PASS |
| Tenant isolation (Postgres + HTTP) | PASS |
| Authorization scope (non-owner denied) | PASS |
| Malicious owner filter cannot widen access | PASS |
| Duplicate event idempotent | PASS |
| Checkpoint + rebuild | PASS |
| Query path read-only | PASS |
| HTTP runtime (parties, work, approvals, attention) | PASS |
| Party projection regression | PASS |
| Manager hierarchy scope | **NOT IMPLEMENTED** — uses `people.admin` + ownership/delegation only |
| Expired delegation visibility test | **PARTIAL** — derivation uses approver id; delegate visibility via `approval.act` in query auth |
| Terminated member query denial | **PARTIAL** — `buildQueryContext` rejects non-active via `assertMemberActive` |

---

## Architecture — Attention derivation (ADR-0005)

Attention is **rebuilt** from work + approval read models on each work-domain event. Not manually edited. Not a second WorkItem.

| Type | Condition | Reason code |
|------|-----------|-------------|
| `open_work_assigned` | Open work owned by member | `work.open.owned` |
| `reassigned_work` | Open work with reassignment history | `work.reassigned.to_you` |
| `overdue_work` | Open work with `dueAt < now` | `work.open.overdue` |
| `pending_approval` | Pending approval for approver | `approval.pending.for_you` |

Completing/cancelling work removes open-work attention. Approval decision removes pending approval attention.

---

## Package / schema map

**Migration:** `20260824190000_os_step15_1_work_attention_projection`

| Table | Role |
|-------|------|
| `os_work_read_models` | Work summary projection |
| `os_approval_read_models` | Approval summary projection |
| `os_attention_read_models` | Derived attention (disposable) |

**Consumer key:** `projection.work.summary.v1`  
**Attention freshness key:** `projection.work.attention.v1`

---

## HTTP endpoints

| Query | Method | Path |
|-------|--------|------|
| SearchParties | GET | `/v1/parties` |
| ListOpenWork | GET | `/v1/work-items` |
| GetWorkItem | GET | `/v1/work-items/:id` |
| ListPendingApprovals | GET | `/v1/approvals` |
| GetApproval | GET | `/v1/approvals/:id` |
| ListAttentionItems | GET | `/v1/attention` |

Authorization: session tenant first; `people.admin` sees org-wide work/approvals; members see own work; approvers/delegates see assigned approvals; attention is **personal** (`memberId = actor`).

---

## Postgres verification (2026-08-24)

```bash
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
./scripts/verify-step-15-1.sh
```

**Log:** `.step15-1-evidence/verify-20260824T125720Z.log`

| Suite | Tests | Result |
|-------|-------|--------|
| work projection prisma integration | 7 | PASS |
| party projection regression | 5 | PASS |
| os-api query runtime HTTP | 4 | PASS |
| os-api tenant isolation | 2 | PASS |

---

## Carmen handoff

### WHERE WE ARE
Lane F read side is **complete for Work / Approval / Attention** at backend/query layer. Party + Work projections run via in-process os-api worker.

### WHAT ACTUALLY CHANGED
- `packages/os-query` — work consumer, query services, attention derivation
- `packages/os-contracts` — work/approval/attention query DTOs
- Migration `20260824190000_os_step15_1_work_attention_projection`
- `apps/os-api` — `/v1/work-items`, `/v1/approvals`, `/v1/attention` (projection-backed)
- Tests: `work-projection-prisma.integration.test.ts`, `query-runtime.test.ts`
- `scripts/verify-step-15-1.sh`
- Minor: `os-database` build copies fresh Prisma client (`rm -rf dist/generated` before copy)
- Minor: re-export `OutboxWorkerRunResult` in `os-events` (unblocks build; Agent 1 adjacent)

**Not modified:** `packages/os-work`, `packages/os-workforce`, Lane E commands, Commercial, UI.

### WORK PROJECTION STATUS
**PASS**

### APPROVAL PROJECTION STATUS
**PASS**

### ATTENTION STATUS
**PASS** (derived-only; explainable reason codes; auto-clears on terminal states)

### WHAT POSTGRES PROVED
Work/approval event → projection; attention derivation; completion clears attention; reassignment updates owner; dedup; rebuild; tenant isolation; auth scope denial.

### WHAT HTTP RUNTIME PROVED
Live `GET /v1/parties`, `/v1/work-items`, `/v1/approvals`, `/v1/attention`; cross-tenant work list 403; guessed work ID 403 for non-owner.

### SECURITY NEGATIVE TESTS
| Test | Result |
|------|--------|
| Tenant B cannot list Tenant A work (HTTP) | PASS |
| Guessed work ID non-owner (HTTP) | PASS |
| Cross-org projection search | PASS |
| Non-admin owner filter widened | PASS (PERMISSION_DENIED) |
| Non-owner get work summary | PASS (PERMISSION_DENIED) |

### WHAT IS NOT VERIFIED
- Manager hierarchy reporting (no manager tree query contract yet)
- Explicit expired-delegation HTTP negative (delegate visibility when active only)
- Terminated member HTTP query (covered by `assertMemberActive` in query context, not dedicated HTTP test)
- Command Center UI
- Notification delivery

### STEP 15 DEFERRALS

| Item | Previous | Current |
|------|----------|---------|
| Work attention read models | OPEN | **CLOSED** |
| ListOpenWork | OPEN | **CLOSED** |
| GetApproval / approval queries | OPEN | **CLOSED** |
| HTTP runtime verification | OPEN | **CLOSED** |
| ListAttentionItems | OPEN | **CLOSED** |
| Manager-scope work visibility | OPEN | **OPEN** (needs workforce manager projection — Agent 1 / Step 13) |
| tsvector party search | DEFERRED | **OPEN** |

### FOUNDATION GAPS
None blocking Commercial **read** consumption. Commercial **commands** remain Step 16.

### CROSS-LANE CHANGE REQUESTS
**NONE** for Lane E event contracts.

### ARCHITECTURE DRIFT
**NO** — Attention remains derived; no second authority introduced.

### LOW-MAINTENANCE HANDOFF
**PASS** — Projections auto-run in os-api; rebuild via `replayWorkProjectionForOrg`; verify via `./scripts/verify-step-15-1.sh`.

### CARMEN REQUIRED FOR NORMAL OPERATION
**NO** for backend read paths. **YES (UI only)** — end users still need production UI (deferred `apps/os-web`).

### REPLACEMENT DEVELOPER TEST
**PASS** — `./scripts/verify-step-15-1.sh`

### NEW MAINTENANCE BURDEN
- Monitor projection freshness metadata on query responses
- Attention full-org rebuild on each work event (acceptable at current scale; optimize later if needed)

### DOES LANE F NOW FULLY SATISFY THE READ-SIDE BLOCKER FOR COMMERCIAL?
**YES** — Party search + Work/Approval/Attention queries are available for Commercial read models.

### WHAT COMMERCIAL IS STILL WAITING ON
1. **Step 16 Commercial commands** (Opportunity, Quote, Order — not Lane F)
2. **Commercial UI** (`apps/os-web` — not built)
3. **Agent 1 workforce transactional gate** — does not block read contracts; may affect operational confidence for workforce commands
4. **Territory policy (RD-04)** — client decision for CommercialAccount lens

### EXACT NEXT ACTION
Approve **Step 16 Commercial v1** gate planning — commands on existing Party + projection query spine.

### EXACT NEXT CURSOR PROMPT (Agent 2 — Architecture/Security reviewer)
Review Step 15.1 evidence at `docs/architecture/STEP_15_1_WORK_ATTENTION_PROJECTION_EVIDENCE.md` and confirm: (1) AttentionItem remains non-authoritative, (2) tenant/auth negative tests are sufficient for current scale, (3) no Lane E or workforce ownership violations in the diff. Report PASS/FAIL only.
