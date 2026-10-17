# Review task R2 — Effective delegation (F10), grant/team range, initial provisioning procedure

Governing decisions: owner messages 2026-10-16 20:03 (§3, §13.8 #2) and 20:39 (§1–§5). Base: `e7d8d98` (R1). State: **IMPLEMENTED + TESTED (unit, disposable Postgres, local HTTP)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed. R1 independent acceptance also still pending.

## 1. F10 — delegated access follows the delegator

Rule (`os-domain` `delegationConfersScope`, used by `computeEffectiveScopes` and by approval delegation in `os-work` `canDecideApproval`): a delegation confers a scope only while
- it is started, not expired and not revoked;
- the delegator is `active` in the delegation's organization;
- the delegator independently holds that scope by their own role assignment at the same `asOf` (no chaining through another delegation);
- the delegator's standing was read with the delegation. Without it the delegation confers nothing (fail closed).

Readers: the four Postgres `listDelegationsForDelegate` readers (workforce, commercial, work, party) read the delegator's status and own role assignments through one include (`os-database/src/delegator-standing.ts`); the workforce memory store does the same. Every hand mapping into `computeEffectiveScopes` (17 sites in packages and os-api) passes the standing through. The delegation row is never rewritten: history stays as granted/revoked.

Coverage of uses:

| Use | How it is stopped | Evidence |
|---|---|---|
| Reads (e.g. `GET /v1/members`) | request snapshot via `computeEffectiveScopes` | HTTP R2 tests 2, 4, 5 |
| New commands | command snapshot via `computeEffectiveScopes` | HTTP R2 test 2 (`ChangeDepartment` 403) |
| Idempotent replays | S11 re-authorizes the actor before returning a stored result | HTTP R2 test 2 (same key, same body → 403, no stored body) |
| Approval decisions by a delegate | `canDecideApproval` uses `delegationConfersScope` | `os-work` unit "F10: the delegate cannot decide once the approver is suspended or no longer holds approval.act" |
| Queued effects | No queued effect carries delegated authority: no stored delegation id outside the delegation table; outbox rows deliver already-committed facts; outbox recovery re-authorizes the recovering actor through the same function; pending approvals recheck at decision time | source search (`delegationId` only in grant/revoke/history) |

Reinstatement (documented, not invented): there is no product command that reinstates a suspended member. Rehire creates a new membership, so a delegation from the old membership never applies again. If a member's status were set back to `active` out of band, an unexpired, unrevoked delegation would apply again, because the rule is evaluated at use time (unit test "a delegator reinstated before expiry confers again"; HTTP R2 test 3 pins it with an explicit out-of-band update). **Reserved owner decision:** keep this, or revoke a member's outgoing delegations on suspension. Not changed here.

## 2. Grant and team range (20:39 §2)

Holding a scope no longer lets a grantor hand out wider resource range. `os-contracts` `commercialReachKeys` expresses reach with the same rules the commands use (`canActOnCustomer`, `canManageCustomerAccountWork`, `canKnowCustomer`, `resolveAccountAssignmentAuthority`): `<action>:org`, `<action>:member:<directReport>`, `reassign:intake`. `os-workforce` `assertReachWithinGrantor` rejects any change that gives the target reach the grantor lacks (own role assignments and own direct reports; delegations excluded):
- `GrantAdditionalRole`: target's current scopes + the new one;
- `ChangeRole`: the replacement role;
- `ChangeManager`: the new manager gains the member as a direct report under every commercial scope they hold.

Also checked: grantor tenant (session organization), active status (snapshot), independent possession (R1), provisioning authority (`people.admin`).

Consequences, stated plainly:
- `people.admin` alone can still assign a manager who holds no commercial range (ordinary HR), but cannot place anyone under a manager who has team range.
- A team-range grantor can extend a lead only over their own direct reports. Org-range holders (`commercial.org.read` for read/edit/archive/reactivate/manage, `commercial.assignment.org` for reassignment) can provision across the organization.
- Granting `commercial.org.read` to someone who already has `commercial.customer.edit` widens their edit to org range, so it needs a grantor with org-wide edit.

## 3. Initial provisioning procedure (20:39 §1) — prepared, not executed

`packages/os-database/src/ops/initial-commercial-bootstrap.ts` + `ops/bootstrap-cli.ts`:
- inputs: organization id **and** slug, existing member id **and** email, scopes, approval reference, operator, reason (all required);
- allowlist: `ADDITIONAL_ASSIGNABLE_SCOPE_KEYS` only (no `people.admin`, technical or reserved scopes);
- dry run (default) prints current vs proposed grants and a plan hash; execution requires that exact hash;
- refuses: wrong tenant (id/slug mismatch), member not in org, member not active, email not an active identity of that member, email resolving to more than one person or membership, scope outside allowlist, scope already held by any active member (then `GrantAdditionalRole` applies), scope bootstrapped before;
- one transaction; ids `bootstrap:<org>:<scope>` make each scope bootstrappable at most once per organization, concurrent runs included;
- writes one business event (`member.bootstrap_grant.applied`, `provenance: bootstrap`, actor null), outbox row and audit row with operator, approval reference, plan hash and reason;
- not exported from `@isalwa/os-database`, not imported by any app (test-enforced), not an HTTP route; creates no identity, password or session.

Tested with synthetic organizations and identities on the disposable cluster (7/7). **Not run against any real or hosted data.**

### Approval request (to be completed by the owner before any execution)

| Field | Value |
|---|---|
| Organization | ISALWA production organization: id and slug to be read from the hosted database by an authorized operator (not inspected in this lane) |
| Member | **owner to name**: existing active member, id + login email. Not chosen by engineering. |
| Proposed scopes (first holder, so that each commercial scope becomes grantable through normal commands) | `commercial.org.read`, `commercial.team.read`, `commercial.customer.create`, `commercial.customer.edit`, `commercial.customer.archive`, `commercial.customer.reactivate`, `commercial.work.manage`, `commercial.account.reassign`, `commercial.assignment.org`, `commercial.intake.assign`, `commercial.order.convert`, `commercial.quote.convert.own` |
| Narrower alternative | only the scopes needed for the first managers now (e.g. `commercial.org.read`, `commercial.team.read`, `commercial.customer.edit`, `commercial.work.manage`); the rest remain ungrantable until a later approved bootstrap |
| Approval reference | owner to supply |
| Execution | separate authorization required; dry-run output reviewed first |

## 4. Build, unit suites and typechecks (reported separately)

Package build (`os-api^...`): exit 0 (`evidence/REVIEW-R2/build.txt`).

| Unit/integration suite | Result |
|---|---|
| os-contracts | 181/0 |
| os-domain | 239/0 |
| os-workforce | 133/0 |
| os-commercial | 101/0 |
| os-party | 34/0 |
| os-work | 22/0 |
| os-issue | 93/0 |
| os-commitment | 18/0 |
| os-import | 28/0 |
| os-events | 12/0 |
| os-query | 77/0 |
| os-request-session | 4/0 |
| os-database (disposable PG) | 299/0 |
| os-api (local HTTP + PG) | 223/0 |
| os-web | 1288/0 |

Typechecks: os-api exit 0; os-database exit 0; os-web exit 0.

**os-web TS5097, now repaired.** Error: `lib/mobile/mobile-390-proof.test.ts(10,50): error TS5097` (import path ending in `.ts` without `allowImportingTsExtensions`). Introduced in `a3747f3` (2026-09-21). Baseline evidence: `evidence/T01/os-web-tsc.txt`, `receipts/T01.md`, `receipts/T02.md`. Impact: `pnpm --filter os-web typecheck` failed; `tsconfig.json` includes `**/*.ts`, so Next's build-time type check would very likely fail on the same file too (not verified by running `next build`; hosted deploy history not inspected). Repair: drop the extension (`'../a11y/breakpoints'`); the test still passes 8/8 under tsx and os-web typecheck is clean.

Still outside the os-api build graph and failing, unrelated to this task: legacy `apps/api` `src/auth/canonical-session.bootstrap.test.ts` (source-text assertion on module wiring, 2/1). This task did not touch `apps/api`. Recorded for a separate repair.

## 5. HTTP + Postgres proofs and mutation checks

- `apps/os-api/src/review-r2-delegation-standing.http.test.ts` 5/5.
- `apps/os-api/src/review-r1-grant-provisioning.http.test.ts` 8/8 (grantor now has org range; new test "ChangeManager cannot extend a manager over someone outside the grantor reach").
- Mutations, each makes exactly one proof fail and was restored (`evidence/REVIEW-R2/mutation-*.txt`): `delegator-status-ignored`, `delegator-possession-ignored`, `change-manager-reach-unchecked`.

## 6. Expectation changes

- `os-domain` "active delegation grants scope" and `trusted-member-context` approval delegation: fixtures now include a delegator who holds the scope (fail-closed rule).
- `os-work` approval fake: delegator standing added.
- `os-database` `workforce-auth-tenant` fake rows: delegator relation shape added.
- R1 HTTP grantor gained `commercial.org.read` (team-range-only grantor is now correctly denied).

## 7. Evidence format and transfer blocker

R2 evidence keeps allowlisted lines only (see `evidence/REVIEW-R1/UNREVIEWED-NOT-FOR-TRANSFER.md` §format). The four R1 files and every commit from `e7d8d98` on are **UNREVIEWED — NOT FOR TRANSFER**.
