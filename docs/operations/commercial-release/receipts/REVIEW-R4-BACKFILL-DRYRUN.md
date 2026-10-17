# REVIEW-R4-BACKFILL-DRYRUN — lifecycle revival backfill proposal (22:20 §3)

State: IMPLEMENTED + LOCALLY TESTED (disposable Postgres, synthetic data). NOT INDEPENDENTLY REVIEWED. **NOT EXECUTED** against any shared, staging or hosted database. Execution is a release dependency and needs a separate owner authorization naming the tenant and the reviewed plan hash.

## 1. Why

Runtime repairs (`3520dfe`, `0316531`) end delegations and coverage at suspension, termination and reactivation from now on. Rows created before those repairs can still be open for members who were suspended or revoked earlier, and would confer authority again (or keep conferring it) once the member is reactivated by any path that predates the repair. This proposal finds them and, only after review, ends them.

## 2. What exists in code

- `packages/os-database/src/ops/lifecycle-revival-backfill.ts`
  - `planLifecycleRevivalBackfill(prisma, request, asOf)` — read-only. Request: organization id + slug (both must match the same row), approval reference, operator, reason. No defaults.
  - Plans to end (set `revokedAt` only; rows kept):
    - unrevoked, unexpired delegations whose delegator or delegate is suspended or revoked;
    - unrevoked coverage whose acting advisor is not active;
    - unrevoked coverage whose primary owner is revoked;
    - unrevoked coverage issued by a suspended owner and recorded before that owner's latest `member.suspended` event.
  - Lists for human review only (never written):
    - coverage issued by a suspended owner with no recorded suspension event (date unknown);
    - open commercial role rows created by legacy `ChangeRole` to an additional-assignable scope (pre-`3520dfe` behavior).
  - `planHash` = SHA-256 over organization id, sorted delegation ids, sorted coverage ids and approval reference.
  - `executeLifecycleRevivalBackfill(prisma, request, confirmPlanHash, asOf)` — recomputes the plan, refuses `PLAN_HASH_MISMATCH` if anything changed, then one transaction: revoke each planned row, one `organization.lifecycle_backfill.applied` business event (provenance `backfill`), outbox and audit. A rerun after success finds nothing and writes no event.
- `packages/os-database/src/ops/lifecycle-backfill-cli.ts` — dry run by default; `--execute <planHash>` required to write.
- `revokeDelegation` (Prisma and memory stores) now sets `revokedAt` only while still null, so the first revocation time is never overwritten.
- Not exported from the package and not imported by any app (asserted by test).

## 3. Checks actually run

Evidence: `evidence/REVIEW-R4-BACKFILL-DRYRUN/`.

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Integration test (disposable PG) | 4/4 |
| os-workforce suite | 145/145 |
| os-database suite | 305/305 |
| os-api suite | 253/253 |
| Typecheck os-workforce / os-database / os-api | exit 0 each |
| Mutations | 3/3 caught (coverage granted during suspension ended; already-revoked delegations re-planned; execution ignores hash) |

## 4. Negative behavior that holds

- Dry run writes nothing (row counts and `revokedAt` unchanged, no events, no audit).
- Wrong slug/id pair, missing approval reference, operator or reason → refused.
- Stale or edited hash → refused, nothing written.
- Review-only items untouched by execution.
- Coverage legitimately granted by a suspended owner after suspension is kept.

## 5. Open / unproven

- Execution against any real tenant: NOT AUTHORIZED, NOT DONE.
- Hosted data shape (how many rows, whether suspension events exist for older suspensions): UNVERIFIED.
- Review-only lists need an owner decision per row; no automatic rule is invented.
- Independent review: pending.
