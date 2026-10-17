# Review R1/R2 follow-up — delegation enforcement, suspension lifecycle, ChangeRole, bootstrap

Governing decision: owner message 2026-10-16 21:33 (targeted R1/R2 re-review, items 1–6). Base: `78003ff` (R3, committed alone; not part of this change). State: **IMPLEMENTED + TESTED (unit, disposable Postgres, local HTTP)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed.

## 1. Delegation enforcement completed (21:33 §1)

Canonical rule: `delegationConfersScope` / `computeEffectiveScopes` (`os-domain`). A delegation confers a scope only when it is unrevoked and in its window, the scope is delegable and listed, and the delegator is active in the same organization and still holds the scope.

| Call site | Before | Now |
|---|---|---|
| `os-query/src/query-context.ts` `delegatedApproverFor` (approval reads in `work/work-auth.ts`) | window + scope only | `delegationConfersScope(d, 'approval.act', asOf)` |
| `os-delivery/src/prisma-store.ts` `getMemberInOrg` | own window check; ignored delegator standing | `computeEffectiveScopes` with delegator standing (same include shape as `os-database`). Delivery scopes stay non-delegable (not in `DELEGABLE_SCOPE_KEYS`) |

Checked, already canonical since R2 (no change): every `computeEffectiveScopes` caller — product-feedback, qa-view, qa-synth-roster, issues, ai, qa and memory controllers; commitment, commercial, work, issue, import, party, location and workforce services; outbox-recovery; trusted-member-context; bootstrap. `work-command-service` `canDecideApproval` (canonical). `prisma-member-query-store` `activeDelegationCount` is a display count, not authority. Targeted search only (`delegat` evaluators); no whole-app audit.

Tests: `os-query/src/query-context.delegation.test.ts` 5/5 (valid delegation reads; revoked, suspended-delegator, no-longer-held → no read; direct `people.admin` still reads). `os-delivery/src/delivery-member-delegation.test.ts` 5/5 (direct grants work; ended grant gives nothing; delivery scopes not delegable; delegable scope from active holder works; revoked/suspended/not-held give nothing). `os-query/src/query-context.tenant.test.ts` fixture now carries delegator standing (its tenant assertions are unchanged).

`os-delivery/package.json` gains `@isalwa/os-domain` (workspace link). `pnpm-lock.yaml`: +3 lines for that link only. The offline install also pruned 110 extraneous `node_modules` entries locally; no lockfile change beyond the link.

## 2. Suspension and termination end delegations (21:33 §2, engineering decision)

- `SuspendMember` and `TerminateMember` revoke, in the same transaction as the status change, every unrevoked, unexpired delegation the member issued **or received**, future-dated ones included (`listUnexpiredDelegationsInvolvingMember`). Only `revokedAt` is set. The `member.suspended` / `member.terminated` payload lists `endedDelegationIds`.
- Reinstatement does not revive them: a fresh authorized grant is required.
- Use-time check stays: an inactive delegator confers nothing even if a row were left unrevoked, so a failed cleanup cannot leave effective access (R2 domain tests).
- Not retroactive: delegations of members suspended before this change are not revoked by a backfill (would need authorization). They already confer nothing while the delegator is inactive; reinstating such a member would revive them under the use-time rule. Residual, reported.
- Queued effects: none carry delegated authority (R2 analysis unchanged). Replays re-authorize.
- Customer coverage grants (own lifecycle, verified): the acting advisor is the session actor and must be active, window rules apply; the primary owner's status is not checked (intentional for "Apoyo temporal"); suspend and terminate are blocked while active primary/acting coverage exists; rehire creates a new member id, so no product-path restoration. Residual: future-dated coverage combined with an out-of-band status change.

HTTP+PG `review-r2-delegation-standing.http.test.ts` 8/8: suspension stops read, new command and replay and revokes the row; reinstatement keeps read and replay at 403 and a fresh grant works; suspending a delegate ends delegations granted to them; future-dated delegations end on suspension; delegator losing the scope; revocation; termination ends a future-dated delegation and records it.

## 3. ChangeRole replaces the primary role only (21:33 §3)

- `os-workforce/src/role-change-plan.ts` `planRoleChange`: primary = open assignments whose key is not additional-assignable; additional grants are preserved unless named in `revokeAdditionalRoleKeys`. Returns ended primary keys, preserved/revoked additional keys, effective scopes before/after, gained, lost.
- The command uses the same plan. Naming a revocation also requires `EndAdditionalRole` authority (same scope, `people.admin`, as ChangeRole today). Revoking a key the member does not hold, or the new role itself, → `VALIDATION_FAILED`, nothing changes.
- Preservation is not a bypass: `assertRoleKeyAssignable` (actor must hold a non-job-title key) and `assertReachWithinGrantor` (resulting reach = new role + preserved grants) still apply.
- Existing behavior kept: a held scope may still be given as the new role (R1 path). If it is already held as an additional grant, that row is kept; no duplicate.
- Preview: `GET /v1/members/:memberId/role-change-preview?roleKey=&revoke=a,b` (`people.admin`, tenant-scoped, 404 for foreign members, no writes). Classified in `inspection-reads.adversarial.test.ts`.
- os-web: `components/admin/role-change-form.tsx` shows ended role, preserved and revoked additional permissions, permissions gained and lost; "Retirar también …" checkboxes; submit disabled until the preview for the current selection has loaded. Panel copy no longer says additional permissions are ended.

Tests: `os-workforce/src/additional-role.test.ts` (ChangeRole describe, 6 tests); HTTP+PG `review-r2b-role-change.http.test.ts` 5/5 (preview = command, primary replaced, grants preserved, payload; explicit revocation; unheld revocation refused with no change; scope/admin the actor lacks and non-admin actor refused; preview needs `people.admin`, 404 cross-tenant, 400 without role); `os-web/lib/workforce/role-change.test.ts` 2/2. Browser check: UNPROVEN.

## 4. Bootstrap: no broad proposal (21:33 §4)

- Removed the 12-scope allowlist. `BOOTSTRAP_PROPOSALS` holds three minimal role-specific proposals for owner approval:

| Proposal | Range | Scopes |
|---|---|---|
| `team_manager` | team | `commercial.team.read`, `commercial.customer.edit`, `commercial.work.manage` |
| `commercial_manager` | organization | `commercial.org.read`, `commercial.customer.edit`, `commercial.work.manage` |
| `customer_data_steward` | team | `commercial.team.read`, `commercial.customer.create`, `commercial.customer.edit` |

- A request must name tenant (id + slug), existing member (id + email), `proposal`, `range` and a subset of that proposal's scopes. No default proposal, person or scope list. Organization-wide scopes (`commercial.org.read`, `commercial.assignment.org`, `commercial.intake.assign`) are refused unless range is `organization`. Scopes outside every proposal (e.g. `commercial.assignment.org`, `commercial.account.reassign`, conversions) stay ungrantable until a later approved change.
- Kept: dry run by default, exact plan hash (now covering proposal and range), identity and ambiguity checks, once-per-scope ids, one transaction, event + outbox + audit. Not exported, not reachable from apps.
- Tests: `initial-commercial-bootstrap.integration.test.ts` 9/9 (adds: proposal shape test; missing/unknown proposal or range, full commercial list, `commercial.assignment.org`, scope outside the named proposal, range mismatch refused; team proposal planned without org-wide scopes). **Not run against real people or hosted data.**
- `receipts/REVIEW-R2.md` §3 approval table updated accordingly.

## 5. Review tracking (21:33 §5)

Reconciliation: F03 = source-reviewed at the named commits, not independently runtime-tested. F04 and F10 deltas above IMPLEMENTED + TESTED locally; they stay partial until reviewed. F01 self-approval open for T04. F10 authorship/access open for R4. F09 stays its own commit (`78003ff`).

## 6. Restricted logs (21:33 §6)

`evidence/REVIEW-R1/UNREVIEWED-NOT-FOR-TRANSFER.md` and the checkpoint now state: branch history and review snapshots stay NOT FOR TRANSFER; future exports are built from an explicit path allowlist that excludes restricted logs before materializing; the logs are not sanitized; the blocked inspection is not retried. This run wrote raw runner output to `/tmp` and filtered allowlisted lines into `evidence/` (a first attempt wrote an unfiltered `build.txt` there; it was removed before commit and regenerated filtered).

## 7. Build, suites, typechecks (reported separately)

Package build (`os-api^...`): exit 0.

| Suite | Result |
|---|---|
| os-contracts | 181/0 |
| os-domain | 239/0 |
| os-workforce | 138/0 |
| os-query | 82/0 |
| os-delivery | 111/0 |
| os-database (disposable PG) | 301/0 |
| os-api (local HTTP + PG) | 237/0 |
| os-web | 1296/0 |

Typechecks (`tsc --noEmit`): os-api, os-web, os-database, os-workforce, os-query, os-delivery — all exit 0.

A first full run found 3 failures, fixed before the final run: the R1 HTTP test relied on ChangeRole to a held scope (kept, see §3; its second failure followed from the first), and the os-query tenant fixture had no delegator standing.

## 8. Mutation checks (each source restored and verified)

| Mutation | Caught by |
|---|---|
| os-query approver ignores delegator standing | query-context.delegation 2 fail |
| delivery ignores delegator standing | delivery-member-delegation 1 fail |
| lifecycle does not revoke delegations | R2 HTTP 6 fail |
| ChangeRole ends all assignments | role-change HTTP 2 fail; additional-role 4 fail |
| bootstrap accepts any commercial scope | bootstrap refusal test fail |

Evidence: `evidence/REVIEW-R2-FOLLOWUP/` (allowlisted ✔/✖/ℹ lines, exit codes, mutation diffs, `tested-source-manifest.sha256`).

## Not done / unproven

Browser verification of the preview form; hosted anything; bootstrap execution (needs owner-named member, approval reference and separate authorization); retroactive revocation for previously suspended members (needs authorization).
