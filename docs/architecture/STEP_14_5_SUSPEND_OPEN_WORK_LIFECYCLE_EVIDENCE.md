# Step 14.5 — Suspend Member / Open Work Lifecycle Evidence

**Phase:** Step 14.5 — Close E-04 suspend ↔ work lifecycle gap  
**Date:** 2026-08-24  
**Gate result:** **CONDITIONAL PASS** (security invariants verified; one client policy item remains open)

**Verification log:** `.step14-5-evidence/verify-20260824T132828Z.log`

---

## Policy / contract audit (repository evidence)

| # | Question | Answer | Source |
|---|----------|--------|--------|
| 1 | Does suspension revoke active access immediately? | **Yes** at OS command/query layer — `accessStatus: suspended` + `assertMemberActive` → `ACCESS_REVOKED` | `workforce-command-service.ts`, `authorization.ts`, STEP_9 §5.4 |
| 2 | Does suspension preserve employment/member identity? | **Yes** — member row retained; Person/history not deleted | ADR-0010, WORKFORCE_ORGANIZATION_LIFECYCLE |
| 3 | Is suspension intended to be temporary? | **Yes** — distinct from termination; reactivation via admin `ActivateMember` / `reactivate_employee` | INCREMENT_7 row 6–7, handoff-manifest admin ops |
| 4 | Can suspended member remain owner of WorkItem? | **Yes** — contract allows **hold** | WORKFORCE_ORGANIZATION_LIFECYCLE § Leave/suspension |
| 5 | Can suspended member act on WorkItem? | **No** — `assertMemberActive` on all work commands | `work-command-service.ts` |
| 6 | Can suspended member approve? | **No** — `ACCESS_REVOKED` | Step 14.4 + 14.5 tests |
| 7 | What happens to delegations? | Delegation rows **persist**; suspended **delegate** cannot act; active delegate may act for suspended **delegator** (coverage) | WORKFORCE doc § Temporary delegation; `memberHasScope` requires active access |
| 8 | Is reassignment-before-suspend required? | **No** — only `TerminateMember` has `requires: open_work_reassignment` | `handoff-manifest.yaml` |
| 9 | Escalation/manager policy documented? | **Partial** — explicit ReassignWork; manager queue deferred (E-06) | PRODUCTION_UI_ADMIN_SELF_SERVICE_READINESS |
| 10 | Different from termination? | **Yes** — terminate blocks on open work + revokes employment; suspend blocks access only | `terminateMember` vs `suspendMember` |

### Classification

| Area | Status |
|------|--------|
| Suspend vs terminate distinction | **CONTRACT EXISTS** |
| Open work on suspend (hold/delegate/reassign) | **CONTRACT PARTIAL** — options documented; mandatory path not chosen |
| Leave-type access rules (unpaid/medical/suspension) | **CLIENT POLICY REQUIRED** — O-05 in INCREMENT_7_DISCOVERY_MATRIX |
| Security invariants (blocked actor) | **CONTRACT EXISTS** — implemented and tested |

**Decision:** Did **not** add open-work block to `SuspendMember`. That would equate suspend to terminate and invent policy not present in `handoff-manifest.yaml` (only `TerminateMember` requires `open_work_reassignment`).

---

## Existing suspend policy (exact rule)

**SuspendMember** (`people.admin`):

1. Sets `accessStatus: suspended` on OrganizationMember.
2. Emits `member.suspended` with atomic BusinessEvent + AuditLog + Outbox + idempotency.
3. Does **not** mutate WorkItem ownership.
4. Does **not** require open work cleared first (unlike TerminateMember).

**Open work while suspended:**

- WorkItem remains owned by suspended member (`hold`).
- Suspended member **cannot** complete, reassign, request approval, approve, or exercise delegation.
- Authorized operator (`people.admin`) uses **ReassignWork** (Lane E) to resolve operationally.
- On reactivation (`ActivateMember`), owner regains ability to complete owned open work.

**TerminateMember** (unchanged):

- Rejects with `VALIDATION_FAILED` when open work exists.
- Operator must ReassignWork first.

---

## Implementation changes

| File | Change |
|------|--------|
| `packages/os-database/src/suspend-open-work-lifecycle.integration.test.ts` | **NEW** — 11 postgres lifecycle/security tests |
| `scripts/verify-step-14-5.sh` | **NEW** — build + lifecycle tests + work regression |

**No changes** to `suspendMember`, Commercial, os-query, os-web, or approval contracts.

---

## Postgres verification (11/11 pass)

| # | Test | Proves |
|---|------|--------|
| 1 | suspends member with no open work | Happy path + event |
| 2 | allows suspend while open work remains owned | Contract: hold ≠ terminate |
| 3 | blocks suspended member from completing work | Security invariant A |
| 4 | blocks suspended member from reassigning work | Security invariant A |
| 5 | blocks suspended member from approve/request approval | Approval interaction |
| 6 | blocks suspended delegate from delegation authority | Delegation bypass prevented |
| 7 | admin can explicitly reassign work after suspend | Resolution path (ReassignWork) |
| 8 | reactivation restores work authority | ActivateMember path |
| 9 | duplicate SuspendMember idempotent | Idempotency |
| 10 | rolls back suspension on append failure | Atomic transaction |
| 11 | rejects cross-tenant suspend target | Tenant isolation |

**Work regression:** 7/7 pass (terminate open-work guard unchanged).

**Verify:** `./scripts/verify-step-14-5.sh`

---

## E-04 status

**PARTIAL**

| Aspect | Status |
|--------|--------|
| Suspended actor authority bypass | **CLOSED** — postgres proof |
| Silent work deletion/reassignment | **CLOSED** — ownership preserved |
| Explicit resolution path | **CLOSED** — ReassignWork documented + tested |
| Mandatory reassignment-before-suspend (reviewer suggestion) | **Not contracted** — would require client decision |
| O-05 leave-type policy | **CLIENT_DECISION_REQUIRED** |
| Auth provider session revoke on suspend | **PARTIAL** — Step 14.6 MOCK-TESTED; live Supabase pending |

---

## Low-maintenance operator guide

### Suspend vs terminate

| | Suspend | Terminate |
|--|---------|-----------|
| Access | `suspended` | `revoked` |
| Employment | unchanged | `terminated` |
| Open work | may remain owned | must reassign first |
| Recovery | `ActivateMember` (reactivate) | `RehireMember` (new period) |

### Safe resolution when work is blocked

1. Admin opens work list (`ListOpenWork`) — work still shows suspended owner.
2. Admin runs `ReassignWork` → active successor.
3. Optional: `SuspendMember` already succeeded; reassignment is independent.

### Failure messages

| Command | Condition | Error |
|---------|-----------|-------|
| Any protected command | Suspended actor | `ACCESS_REVOKED` |
| TerminateMember | Open work exists | `VALIDATION_FAILED` |
| ReassignWork | New owner not active | `VALIDATION_FAILED` |
| SuspendMember | Target not in tenant | `NOT_FOUND` |

---

## Carmen handoff

### WHERE WE ARE

E-04 security and lifecycle behavior is verified against existing architecture. Suspend intentionally differs from terminate: open work may remain owned while the suspended member cannot act. No policy was invented.

### E-04 STATUS

**PARTIAL** — security/orphan invariants closed; O-05 client leave policy and auth-provider session revoke on suspend remain open.

### EXISTING SUSPEND POLICY FOUND

**SuspendMember** suspends access immediately at OS layer, preserves member identity and work ownership, does not require open-work clearance. Resolution is explicit **ReassignWork** by `people.admin`. **TerminateMember** alone requires open-work clearance first (`handoff-manifest.yaml` `requires: open_work_reassignment`).

### OPEN WORK BEHAVIOR

**Hold** — WorkItem stays owned by suspended member; status remains `open`; ownership history unchanged; no silent reassignment.

### SUSPENDED MEMBER AUTHORITY

Blocked via `assertMemberActive` / `memberHasScope`: cannot complete work, reassign work, request/approve/reject, exercise delegation, or run governed commands.

### DELEGATION BEHAVIOR

Delegation records persist. Suspended **delegate** → `ACCESS_REVOKED`. Active delegate may still act for suspended **delegator** (documented coverage pattern).

### APPROVAL BEHAVIOR

Suspended member cannot approve, reject, or request approval. Step 14.4 contracts unchanged.

### REACTIVATION BEHAVIOR

`ActivateMember` sets `accessStatus: active`; suspended owner can complete previously owned open work. No work ownership mutation on suspend/reactivate.

### WHAT POSTGRES PROVED

11 lifecycle tests + 7 work regression tests; log `.step14-5-evidence/verify-20260824T132828Z.log`

### TRANSACTION / ROLLBACK

**PASS** — SuspendMember rolls back on `TEST_APPEND_FAIL`; idempotency verified.

### WHAT IS NOT VERIFIED

- Auth provider session/credential revoke on suspend/terminate — **CLOSED at live Supabase tier (Step 14.6B)**; rehire invite deferred
- Dedicated `ReactivateMember` command (uses `ActivateMember` today)
- Manager-scoped ReassignWork without `people.admin` (E-06)
- Attention projection reasonCode for suspended-owner work (would need CROSS_LANE_CHANGE_REQUEST for os-query)

### CLIENT DECISION REQUIRED

**YES** — exact decision (do not choose for ISALWA):

> For temporary suspension (`SuspendMember`), must ISALWA **mandatorily reassign all open WorkItems before suspend** (same as termination), or is **hold-with-blocked-actor + explicit admin ReassignWork** acceptable?

**Architecture consequences:**

- **Mandatory reassignment:** requires code change to `suspendMember` mirroring `terminateMember`; UI wizard same as terminate.
- **Hold (current contract):** suspend succeeds with open work; admin reassigns when ready; work visible in ListOpenWork with suspended owner until reassigned.

Also open: **O-05** — leave types (unpaid, medical, suspension) access rules (`INCREMENT_7_DISCOVERY_MATRIX`).

### CROSS-LANE CHANGE REQUESTS

None implemented. Optional future: Attention `reasonCode` for suspended-owner blocked work → Lane F.

### ARCHITECTURE DRIFT

**NO** — verified existing contract; no new HR policy encoded.

### LOW-MAINTENANCE HANDOFF

**PASS** — suspend vs terminate, resolution path, errors, and verify script documented.

### CARMEN-DISAPPEARANCE TEST

**PASS** — run `./scripts/verify-step-14-5.sh`; read this doc § Existing suspend policy.

### DOES E-04 BLOCK COMMERCIAL?

**NO** for Commercial core. **NO** for Commercial→Approval (already blocked by Step 14.4). O-05 leave policy flagged REQUIRED BEFORE COMMERCIAL in discovery matrix — client should confirm before HR-sensitive commercial workflows.

### EXACT REVIEW REQUEST FOR AGENT 3

1. Confirm `handoff-manifest.yaml` — only `TerminateMember` has `requires: open_work_reassignment`.
2. Re-run `./scripts/verify-step-14-5.sh`.
3. Verify suspend-with-open-work preserves ownership and blocks actor authority.
4. Confirm no implementation equates suspend to terminate without client decision.
5. Update E-04 status in `ACTIVE_LANES_REVIEW.md`.

### EXACT NEXT ACTION

Agent 3 re-review E-04 evidence; ISALWA leadership resolves O-05 / mandatory-reassign-before-suspend client decision if desired.

### EXACT NEXT CURSOR PROMPT

```
STEP 14.5 / E-04 INDEPENDENT RE-REVIEW — Suspend vs open work lifecycle

Read docs/architecture/STEP_14_5_SUSPEND_OPEN_WORK_LIFECYCLE_EVIDENCE.md
Run ./scripts/verify-step-14-5.sh
Confirm suspend hold-policy matches handoff-manifest (terminate-only open-work gate).
Update ACTIVE_LANES_REVIEW.md E-04 status. Do not implement mandatory reassignment-before-suspend unless client decides.
```
