# REVIEW-R4-BOOTSTRAP-PLAN — multi-holder initial provisioning plan (22:29 decision 2)

State: IMPLEMENTED + LOCALLY TESTED (disposable Postgres, synthetic identities). NOT INDEPENDENTLY REVIEWED. **NOT EXECUTED** for any real organization or person. Execution needs owner-named holders, an approval reference and a separate authorization.

Source finding: `RE-REVIEW_R3_R2F.md` §6 (provisioning-order constraint); recommendation (i) adopted by decision 2. Recommendation (ii), "one commercial manager also holds people.admin", is not used.

## 1. Behavior

`packages/os-database/src/ops/initial-commercial-bootstrap.ts` replaces the one-member request with one plan (no parallel path):

- **Request:** organization id + slug, `holders[]` (member id + email, proposal, range, scopes, and for team range the exact current `directReportIds`), approval reference, operator, reason. No defaults, no recipients filled in, no all-scopes proposal.
- **Three cases kept apart:**
  - *first-time establishment* — a scope that no active member holds and that no earlier plan bootstrapped in this organization. Exactly one holder per scope (lowest member id, deterministic) gets the id `bootstrap:<org>:<scope>`;
  - *distribution within the same plan* — the same scope to other named holders, ids `bootstrap:<org>:<scope>:<memberId>`, same transaction;
  - *normal subsequent grants* — anything else. A scope held outside the plan (non-bootstrap active holder) or bootstrapped by a different plan refuses the whole plan with `SCOPE_HELD_OUTSIDE_PLAN`; `GrantAdditionalRole` and the other governed commands apply.
- **Validation before any write:** tenant, every holder's membership, active standing, unique identity by email, proposal/range/scope bounds, organization-wide scopes only with range `organization`, one entry per holder, manager prerequisites (listed direct reports must equal current manager relationships), and current holding state.
- **Hash:** SHA-256 over organization id, holders sorted by member id (proposal, range, sorted scopes, sorted direct reports) and approval reference. Listing order does not change the hash or the result.
- **Execution:** recomputes the plan, refuses `PLAN_HASH_MISMATCH`, then one transaction: lock and recheck each holder, insert every grant, one `organization.bootstrap_plan.applied` event (provenance `bootstrap`, no actor), outbox, audit with before/after per holder. Re-running an applied plan returns `alreadyApplied: true` and writes nothing.
- **Concurrency:** deterministic ids. The same plan twice gives one set. Two different plans establishing the same scope collide on the primary key and one rolls back completely.
- **Anti-escalation kept:** proposal allowlist (no `people.admin`, no `commercial.assignment.org`, no conversion scopes); not exported from the package and not imported by any app; creates no identity or session.

Order for a real roster (`RE-REVIEW_R3_R2F.md` §6): manager relationships (`ChangeManager`) → one plan with organization-range and team-range holders → ordinary governed grants.

## 2. Synthetic Jefe/Gerencia test

Two Gerentes (`commercial_manager`, organization) and one Jefe (`team_manager`, team, two advisors as direct reports); none holds people.admin. One plan establishes four scopes; `commercial.customer.edit` is established once and distributed twice. Reversed listing gives the same hash and identical result. After execution each holder has exactly its proposal scopes; the advisors receive nothing.

## 3. Checks actually run

Evidence: `evidence/REVIEW-R4-BOOTSTRAP-PLAN/`.

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Plan integration test (disposable PG) | 7/7 |
| os-database suite | 303/303 (previous 305: the 10 single-member bootstrap tests were replaced by 7 plan tests covering the same refusals plus the new cases) |
| os-api suite | 253/253 |
| Typecheck os-database / os-api | exit 0 each |
| Mutations | 6/7 caught; see below |

Mutation M7 (remove the in-transaction standing recheck) **survives**: planning already refuses inactive holders, and the recheck only covers suspension between planning and the transaction. No deterministic race test was written.

## 4. Open / unproven

- Execution with real holders: NOT AUTHORIZED, NOT DONE. Holders, ranges, scopes and approval reference must come from the owner.
- Manager prerequisites are read before the transaction, not re-read inside it (a race with `ChangeManager` during execution is not covered).
- After the plan, advisors still receive commercial scopes only through `GrantAdditionalRole`. That needs a grantor who holds people.admin, holds the scope and has enough reach. The plan does not change that, and no advisor proposal is invented.
- The `customer_data_steward` name (review §6 note) is unchanged; renaming is a naming decision, not a security issue.
- Hosted grants: UNVERIFIED. Independent review: pending.
