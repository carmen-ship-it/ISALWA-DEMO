# Review R4 — ActivateMember does not revive authority from the previous lifecycle

Governing decision: owner message 2026-10-16 22:29, decision 1, from `RE-REVIEW_R3_R2F.md` §4. Base: `3520dfe16e9d2f2e97e84cb9b7545d40f7b02570`. State: **IMPLEMENTED + TESTED (unit, disposable Postgres, local HTTP)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed.

## Behavior

- `ActivateMember` on a **suspended** member (reinstatement) does all of the following in the activation transaction, after setting the member active:
  - Ends every unrevoked, unexpired delegation the member issued or received, future-dated ones included, using the same helper as suspension.
  - Ends unended coverage the member **received** as acting advisor.
  - Writes only `revokedAt`, so the rows and their history are kept.
  - The `member.activated` payload lists `endedDelegationIds` and `endedCustomerCoverage`.
- This covers members suspended before `ce74648`, whose delegations were never ended.
- Coverage the member **issued** (as primary owner) is kept. It may be granted to a helper during the suspension ("Apoyo temporal") and confers nothing on the owner.
- First activation of an **invited** member is not a reinstatement. Nothing is ended, and delegations given while invited stay.
- Activating an already **active** member is refused (`VALIDATION_FAILED`, unchanged) and touches nothing.
- Atomicity: everything runs in the command transaction. If any step fails, the member stays suspended and nothing is ended. Proven on Postgres by failing the event/outbox append.
- Concurrency:
  - `lockMemberForUpdate` row-locks the member (`SELECT … FOR UPDATE`; Postgres requires a transaction) before its status is read in `ActivateMember`, `SuspendMember`, `TerminateMember`, and for the delegate in `GrantDelegation`.
  - `GrantDelegation` now refuses a suspended or removed delegate (`VALIDATION_FAILED`). An invited delegate is still allowed (existing behavior).
  - A grant racing with activation is therefore either refused (it saw the suspended member) or created after activation committed, in which case it is a legitimate new delegation and stays.
  - The lock also serializes suspension or termination against a concurrent grant to the same member.
- The memory store's lock is a no-op, since it is single-threaded.

## Tests

- `os-workforce/src/reactivation-lifecycle.test.ts` 5/5:
  - legacy member reactivated: issued (current and future) and received delegations, plus received coverage, end; issued coverage is kept; rows kept; nothing effective later; payload checked;
  - a fresh grant after reactivation works;
  - repeated activation is refused and leaves the current delegation in force;
  - invited-member first activation ends nothing;
  - a grant to a suspended member is refused with no writes.
- HTTP+PG `review-r4-reactivation.http.test.ts` 6/6:
  - legacy rows written directly, as pre-`ce74648` code left them (suspended, unrevoked);
  - `ActivateMember` over HTTP ends them, with only `revokedAt` written; old delegations stay ineffective (`GET /v1/members` 403), including the received one whose holder is active; payload checked;
  - a fresh grant works, and repeated activation → 400 with the fresh grant still in force;
  - a grant to a suspended member → 400 with no row;
  - six rounds of concurrent `ActivateMember` + `GrantDelegation`: in each, either the grant was refused and nothing is open, or only the post-activation grant is open and effective;
  - a forced append failure → member still suspended and delegation unrevoked; the retry succeeds.
- `review-r2-delegation-standing.http.test.ts`: only a stale comment changed ("no product command reinstates" was wrong; see `RE-REVIEW_R3_R2F.md` §4).

## Build, suites, typechecks (reported separately)

Package build (`os-api^...`): exit 0.

| Suite | Result |
|---|---|
| os-workforce | 145/0 |
| os-database (disposable PG) | 301/0 |
| os-api (local HTTP + PG) | 251/0 |

Typechecks (`tsc --noEmit`): os-api, os-workforce, os-database — all exit 0. os-web, os-contracts, os-domain, os-query and os-delivery are unchanged since `3520dfe` (all green there).

## Mutation checks (each source restored from a file backup and verified)

| Mutation | Caught by |
|---|---|
| reactivation ends nothing | unit 1 fail; HTTP 2 fail |
| grant to a suspended delegate allowed | unit 1 fail; HTTP 1 fail |
| reactivation also ends issued coverage | unit 1 fail |

Limitation: the concurrency test checks the invariant over six real races. It does not force a particular interleaving, so it does not prove the row lock on its own. Removing the lock is not reliably caught; the lock is justified by Postgres row-locking semantics.

Evidence: `evidence/REVIEW-R4-REACTIVATION/` (allowlisted ✔/✖/ℹ lines, exit codes, `tested-source-manifest.sha256`).

## Not done / unproven

- Historical backfill stays a separate dry-run and activation dependency. This runtime repair changes no hosted or shared data.
- Browser verification: none needed for this server-only change; the existing admin "Reactivar" flow is UNPROVEN in a browser.
- Coverage granted to a member as acting advisor while they were active, then suspended under the pre-correction code: suspension was blocked then, so only future-dated rows could remain. They now end on reactivation (above) and are included in the backfill dry run.
