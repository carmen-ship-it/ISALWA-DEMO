# Review R4 corrections — lifecycle ends customer coverage; persistent extra grants only by explicit grant

Governing decision: owner message 2026-10-16 22:20, corrections 1–2. Correction 3 (dry-run backfill proposal) is a separate commit. Base: `ce7464831cac67d03344361151c2df536d3d7d56` (R2 follow-up, committed alone; not modified here). State: **IMPLEMENTED + TESTED (unit, disposable Postgres, local HTTP)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed.

## 1. Suspension and termination are not blocked by customer coverage (22:20 §1)

- `primary_customer_coverage` and `acting_customer_coverage` moved from `SUSPEND_ACTIONABLE_CATEGORY_KEYS` to the new `LIFECYCLE_ENDED_CATEGORY_KEYS` (`os-contracts/src/queries.ts`). They still appear in the impact preview but no longer count toward `totalBlockingCount`.
- `SuspendMember` and `TerminateMember` end, in the same transaction as the status change and after the delegations, every unrevoked coverage grant that has not ended where the member is primary owner (issued) or acting advisor (received). Future-dated grants are included. Only `revokedAt` is set, so the rows and their history are kept (`listUnendedCustomerCoverageInvolvingMember`, `revokeCustomerCoverageGrant` with `revokedAt: null` guard in Postgres).
- Responsibility: pending work goes back to the primary owner when that owner is another active member. Otherwise the customer is recorded as unresolved. Access revocation is never delayed. The `member.suspended` / `member.terminated` payload carries `endedCustomerCoverage[{grantId, customerPartyId, memberRole, responsibleMemberId}]` and `unresolvedCustomerPartyIds`. There is no explicitly authorized replacement queue in the product today, so no automatic reassignment is invented.
- Reinstatement does not revive coverage. A fresh `GrantCustomerCoverage` by an authorized actor is required.
- UI copy: `termination-impact-panel.tsx` and `commercial-continuity-panel.tsx` say coverage does not block, ends at that moment (scheduled too), stays in the history and does not come back on reactivation.

Tests:
- `os-workforce/src/termination-preflight.test.ts` 9/9. Two tests rewritten from "blocks" to:
  - termination with issued coverage succeeds, ends it, records the customer unresolved;
  - suspension ends current and future received coverage, leaves expired/revoked rows untouched, returns responsibility to the active owner.
- HTTP+PG `review-r4-lifecycle-coverage.http.test.ts` 4/4:
  - suspension succeeds with current and future coverage; read 200→403, command 403, replay 403; rows kept, audit and payload present;
  - after reinstatement: read 404, command 404, and a fresh grant works;
  - termination with future-dated coverage succeeds;
  - suspended primary owner → `responsibleMemberId` null, customer unresolved.
- `os-web/lib/commercial/admin-continuity.test.ts`: the source-text test that required the old blocker copy now requires the non-blocking copy (expectation changed by 22:20 §1).

## 2. Persistent extra grants only by explicit, independently authorized grant (22:20 §2)

- `planRoleChange` (shared by the preview and `ChangeRole`) refuses an additional-assignable key as the new primary role (`VALIDATION_FAILED`). Commercial scopes are given only by `GrantAdditionalRole`, which already requires the grantor's own (non-delegated) possession, people.admin and reach.
- A duplicate `GrantAdditionalRole` stays a no-op (`alreadyAssigned`), and that explicit grant survives primary-role replacement.
- UI: `member-admin-actions-panel.tsx` explains that additional permissions are permanent, survive a change of primary role, end only by explicit withdrawal, and can be given only by someone who holds them through their own role, not a delegation.

Tests:
- `os-workforce/src/additional-role.test.ts` 23/23. The R1-era "held scope may still be given as the new role" test was replaced by three:
  - a role change cannot make a commercial scope primary (preview refuses too);
  - duplicate grant is a no-op, and the explicit grant survives a role change;
  - delegated people.admin cannot create a persistent extra grant, and people.admin cannot itself be an extra grant.
- HTTP+PG `review-r4-persistent-grant.http.test.ts` 4/4:
  - ChangeRole to a commercial scope refused even for a holder, no rows written;
  - delegated people.admin → 403, no rows;
  - people.admin as an extra grant → 400; people.admin without the scope → 403;
  - an explicit grant persists across ChangeRole, and a duplicate is a no-op.
- HTTP+PG `review-r1-grant-provisioning.http.test.ts` 8/8. The "equivalent path: ChangeRole to a held scope" now asserts refusal with no change, then the explicit `GrantAdditionalRole` (expectation changed by 22:20 §2).
- The redundant service-level copy of the refusal was removed, so the shared plan is the single rule.

## 3. Findings recorded (not fixed here)

- **S11 resource-level replay gap.** An accepted replay re-checks command-level scope only. After reinstatement, the same actor replaying the same idempotency key receives their own stored result (201) for a resource they no longer have authority over. No new write happens. This affects every service using `acceptedReplay`, and the R4 HTTP test pins the current behavior. Proposed task: re-run the resource authority check before returning a stored result (owner-placed; suggested with T04/T05).
- **Legacy role rows.** Members given a commercial scope through `ChangeRole` before this change hold it as an open row that now behaves as a persistent extra grant. These rows are included in the correction 3 dry-run proposal; nothing is changed now.
- **Pre-change suspended members.** Their delegations and coverage may still be unrevoked. Covered by the runtime activation repair (next task) and by the correction 3 dry-run proposal.

## 4. Build, suites, typechecks (reported separately)

Package build (`os-api^...`): exit 0. os-workforce rebuilt after the last edit: exit 0.

| Suite | Result |
|---|---|
| os-contracts | 181/0 |
| os-domain | 239/0 |
| os-workforce | 140/0 |
| os-query | 82/0 |
| os-delivery | 111/0 |
| os-database (disposable PG) | 301/0 |
| os-api (local HTTP + PG) | 245/0 |
| os-web | 1296/0 |

Typechecks (`tsc --noEmit`): os-api, os-web, os-database, os-workforce, os-contracts — all exit 0.

The first full run had one os-web failure, the copy test described in §1. It was fixed and os-web rerun.

## 5. Mutation checks (each source restored from a file backup and verified)

| Mutation | Caught by |
|---|---|
| lifecycle does not end coverage | termination-preflight 2 fail |
| shared role-change rule accepts an additional-assignable key | additional-role 1 fail |
| coverage counted as blocking again | termination-preflight 2 fail |

A first M2 against the service-level copy was not caught, because the shared plan already refused the key. The copy was removed and M2 re-targeted at the shared rule.

Evidence: `evidence/REVIEW-R4-CORRECTIONS/` (allowlisted ✔/✖/ℹ lines, exit codes, `tested-source-manifest.sha256`).

## Not done / unproven

- Browser verification of the new copy.
- Hosted anything.
- Backfill for previously suspended members (dry-run proposal follows; execution needs authorization).
- S11 replay gap (proposed task above).
- An authorized replacement queue for unresolved customers. None exists; unresolved customers are recorded only.
