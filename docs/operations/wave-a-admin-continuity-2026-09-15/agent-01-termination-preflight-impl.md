# WAVE A AGENT 1 — Termination preflight + fail-closed gate

**Date:** 2026-09-15  
**Agent:** 1  
**Branch:** `wave-a/admin-continuity`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Scope:** Backend fail-closed TerminateMember continuity + `GET /v1/members/:memberId/termination-impact`.  
**Not in scope:** os-web admin panel wiring (other agents); migrations; granting `people.admin` to Owner; Prisma direct reassignment.

---

## Status

| Subfeature | State |
| --- | --- |
| Store continuity list methods | IMPLEMENTED |
| TerminateMember fail-closed beyond open work | IMPLEMENTED + TESTED (unit) |
| `reason` on `member.terminated` payload | IMPLEMENTED + TESTED (unit) |
| `GET .../termination-impact` (`people.admin`) | IMPLEMENTED |
| `os-api-client.getTerminationImpact` | IMPLEMENTED |
| Hosted / browser proof | UNPROVEN |
| Quote owner reassignment command/UI | FOUNDATION_GAP (blocks terminate; no AssignQuoteOwner) |

---

## What shipped

### OsWorkforceStore (+ memory + Prisma)

New org-scoped list methods for a member:

| Method | Predicate |
| --- | --- |
| `listOpenWorkItemsForMember` | existing — `status = open` |
| `listActiveCommercialAccountsForOwner` | `ownerMemberId` + `status = active` |
| `listOpenOpportunitiesForOwner` | `ownerMemberId` + `status = open` (exact enum) |
| `listBlockingQuotesForOwner` | `ownerMemberId` + `status ≠ cancelled` |
| `listActiveOrdersForOwner` | `ownerMemberId` + `status = open` |
| `listPendingApprovalsForApprover` | `approverMemberId` + `status = pending` |
| `listActiveDirectReportAssignments` | `managerMemberId` + active as-of |
| `listActiveDelegationsInvolvingMember` | FROM or TO + started, non-expired, non-revoked |

**Quote status note:** product enum is `draft | submitted | accepted | cancelled`. There is **no** `closed` quote status. Cancelled releases ownership; accepted remains blocking (fail-closed).

### TerminateMember

- Uses `collectTerminationImpact`; if **any** category count > 0 → `VALIDATION_FAILED` (same client code as open-work gate today; no new HTTP error shape).
- Optional `payload.reason` is included on the `member.terminated` event payload when non-empty (`buildBusinessEvent` accepts free-form payload — not a schema FOUNDATION_GAP).

### Read API

- `GET /v1/members/:memberId/termination-impact`
- Auth: `people.admin` via `assertQueryScope` in `MembersController` (same fail-closed as directory)
- Response: Spanish labels + counts + item summaries; stable category keys (not business-event types); quote category includes FOUNDATION_GAP note for AssignQuoteOwner when count > 0
- Client: `createOsApiClient(...).getTerminationImpact(memberId)`
- UI wiring (other agent): `TerminationImpactPanel` on member admin page

### Shared collector

`packages/os-workforce/src/termination-impact.ts` — used by command gate and members read API.

---

## FOUNDATION_GAP

1. **No `AssignQuoteOwner` command** — terminate still **blocks** on non-cancelled owned quotes and surfaces count/items; operators have no governed reassignment command/UI for quotes (fixture tooling patches write-model only). Documented on impact category `foundationGaps`.
2. **Order owner reassignment** — no dedicated AssignOrderOwner in contracts either; terminate blocks on open owned orders. Reassignment path (if any) is out of this agent’s scope; gate is fail-closed.

---

## Tests

| Suite | Coverage |
| --- | --- |
| `packages/os-workforce/src/termination-preflight.test.ts` | Blocks on account / opp / quote / order / approval / reports / delegations; ignores cancelled/expired; reason on event; Spanish labels |
| `packages/os-database/src/workforce-prisma.integration.test.ts` | Lifecycle: active delegation blocks terminate; revoke then terminate with reason |

---

## Explicit non-actions

- No Prisma migrations  
- Did not grant `people.admin` to Owner  
- No Prisma direct owner reassignment  
- Did not heavily edit `apps/os-web` admin panel (only `os-api-client` + types for other agents)

---

## Unblock / follow-on

- UI agent: wire terminate preflight panel to `getTerminationImpact`  
- Product: AssignQuoteOwner (and possibly order owner) commands if operators must clear quote/order ownership without cancel  
- Integration: optional Prisma seed proving commercial account / opportunity block paths when DB available  
