# REVIEW-R4-REASSIGN-WORK — ReassignWork authority by work class (R4 part B repair 1; 23:27 §1)

State: IMPLEMENTED + LOCALLY TESTED (unit, disposable Postgres, local HTTP). NOT INDEPENDENTLY REVIEWED. BROWSER CHECK UNPROVEN. Required authorization repair (not optional cleanup). Repairs 2 (`organization_member` approvals) and 3 (F07 commitments across list/detail/related paths) are REQUIRED and still OPEN; not in this commit.

Rule applied (23:27 §1): reassignment needs current authority over the work AND the specific reassignment permission for its class. people.admin alone does not authorize reassigning commercial or purchasing work. Refused attempts change nothing, and unknowable work gets the same answer as a missing id.

## 1. Behavior

Work class (`packages/os-contracts/src/work-reassignment.ts`, `classifyWorkForReassignment`):

| Class | How it is recognized | Who may reassign |
|---|---|---|
| customer | subject `party` or `commercial_account` | `canManageCustomerAccountWork` on the account owner: `commercial.work.manage` plus range (`commercial.org.read`, or `commercial.team.read` with the account owner a direct report) |
| purchasing | open purchasing prep review marker `[[order-prep:purchasing:…]]` | nobody (no reassignment permission exists for it) |
| linked | subject `work_item` | follows the referenced item's class (up to 3 levels; deeper → refused) |
| general | everything else, including production/warehouse prep reviews | people.admin (workforce continuity) |

`WorkCommandService.reassignWork` (`packages/os-work/src/work-command-service.ts`):
- `COMMAND_REQUIRED_SCOPES.ReassignWork` is now `member_active`; authority is decided per class as above. Delegated scopes count under the current delegation rules (snapshot `delegatedScopes`).
- Missing work → `NOT_FOUND`. No authority → `NOT_FOUND`, except the current owner, who already knows the item → `PERMISSION_DENIED`.
- Target: must exist in this organization and be active (same eligibility as account reassignment, `resolveAccountAssignmentAuthority`). Under team range the target must be the actor or a direct report of the actor. Otherwise `VALIDATION_FAILED`.
- Checks run before any write; the update, ownership history and `task.reassigned` event are unchanged when allowed.
- New store reads: `getCustomerAccountForWorkSubject`, `isDirectReport` (Prisma: `osCommercialAccount`, `osManagerAssignment`, effective at the command time).

Customer access is not widened by assignment: `canReadCustomer` ignores work ownership. The HTTP test shows that a new owner of customer work reads the work item but gets 404 on the customer.

Workforce continuity list (`packages/os-query/src/work/work-query-service.ts`): `GET /work-items?ownerMemberId=<other>` by people.admin without `visibility` returns only that member's **general** work, the class people.admin may hand off. Customer and purchasing items are not listed. Other members still get 403 for another owner's list. This restores the admin team-member panel (`administracion/equipo/[memberId]`), which part A had turned into a silent empty list. Work detail stays 404 for people.admin.

## 2. Tests changed to the decided policy (not weakened)

- `os-query leadership-visibility.test.ts`: `ReassignWork` scope `people.admin` → `member_active` (authority by class). The check that read scopes never appear in admin command code still holds.
- `os-work auth-query-tenant.test.ts`: stub supplies the tenant-checked work lookup; it still asserts role, delegation and work reads use the session organization.
- `os-database work-prisma.integration.test.ts`: non-admin member on general work → `NOT_FOUND` (was `PERMISSION_DENIED`), plus no ownership history row.
- `os-database party-timeline-work-approval-prisma.integration.test.ts`: party-subject work is reassigned by a commercial manager (`commercial.work.manage` + `commercial.org.read`) instead of a people.admin owner.
- `os-web lib/work/reassign-work-admin.test.ts`: `ReassignWork` scope `people.admin` → `member_active`; the admin panel surface checks are unchanged.
- `os-api review-r4-work-reads.http.test.ts`: people.admin's owner-filtered list returns only general work (was 403); a team.read holder listing a non-report still gets 403.

## 3. New HTTP + PG proof (`apps/os-api/src/review-r4-reassign-work.http.test.ts`, 6 tests)

Each refused attempt compares the work row (owner, version), ownership history, business events, outbox messages, audit rows and internal notifications for the item before and after (projections drained). All are unchanged.
- people.admin on customer, linked-customer and purchasing work → 404, the same body as a missing id, with no trace.
- `commercial.team.read` without `commercial.work.manage`, an unrelated member, Compras on purchasing prep, `commercial.work.manage` holder on general work → 404, no trace; the current owner → 403, no trace.
- Targets: other tenant, suspended (including a direct report), unknown, and outside the team range → 400, no trace (team range, org range, and general).
- Team-range manager moves customer work to a direct report; the new owner reads the work but not the customer (404).
- Org-range manager moves customer work and linked work to any active member.
- people.admin continuity list shows only the member's general items and still moves general work.

## 4. Checks actually run

Evidence: `evidence/REVIEW-R4-REASSIGN-WORK/`.

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| New HTTP + PG test | 6/6 |
| os-work suite | 22/22 |
| os-query suite | 82/82 |
| os-database suite | 303/303 |
| os-api suite | 265/265 |
| os-web suite | 1298/1298 |
| Typecheck os-contracts / os-work / os-database / os-query / os-api / os-web | exit 0 each |
| Mutations | 9/9 caught (`mutations.txt`) |

## 5. Open / noted

- Interpretations to confirm in review: purchasing prep is not reassignable (no permission exists); production/warehouse prep reviews are general; linked work follows the referenced item; team-range targets must be the actor or a direct report; the continuity list is general-only.
- Admin panel copy (`reassign-work-panel.tsx`) does not yet say that customer and purchasing work is handed off by commercial managers; the panel just lists fewer items. Copy change left for the UI pass (T10), not done here.
- `commercial_account` subjects resolve through `osCommercialAccount.id`; an account without an owner refuses customer reassignment.
- Browser verification: UNPROVEN. Independent review: pending.

## 6. Addendum: contract correction (23:47 §A, decision B12)

State: IMPLEMENTED + LOCALLY TESTED (unit, disposable Postgres, local HTTP). NOT INDEPENDENTLY REVIEWED. BROWSER CHECK UNPROVEN. Mutation evidence INCOMPLETE (see below). Supersedes the "production/warehouse prep reviews are general" interpretation in §1 and §5.

Behavior:
- **Domain from explicit signals only** (`classifyWorkForReassignment`):
  - source markers written at creation: `[[order-prep:<department>:…]]`, `[[production-update:…]]`, `[[production-next:…]]`, `[[compras-result:…]]`;
  - the fixed production next-action title (`PRODUCTION_NEXT_ACTION_TITLE_PREFIX`);
  - the subject relationship.
  - New classes `production`, `warehouse`, `unknown`. Conflicting markers, an unrecognized marker or an unrecognized subject type → `unknown`, which fails closed.
  - `general` is now only subject `organization_member` or an unlinked task with no marker.
- **Production, warehouse and purchasing reassignment is disabled** (`WORK_REASSIGNMENT_PENDING_AUTHORITY`), pending a bounded authority definition. This is an incomplete workflow, not a permanent refusal. people.admin is no longer a universal operational reassignment permission.
- **Target prerequisite for customer work** (`canPerformCustomerWork`): the target must already be able to work this customer. That means the account owner, an active coverage grant covering `commercial.work`, or manager work authority with range. Assignment grants nothing. Otherwise the command returns `TARGET_PREREQUISITE_MISSING` (HTTP 400) and changes nothing. New store read: `listActiveCustomerCoverageForMember`.
- **Production next-action tasks** (`os-web lib/postsale/expected-date-work.ts`) now carry `productionNextActionMarker(orderId)`, so new tasks classify as production by marker. Older tasks are recognized by the fixed title.
- **Admin panel copy** (`reassign-work-panel.tsx`): commercial work is reassigned from commercial management. Production, Almacén and Compras work is coordinated with each area, and its reassignment is not available yet. The empty state reads "No hay trabajo para reasignar desde aquí…". os-web maps `TARGET_PREREQUISITE_MISSING` to actionable Spanish copy.

Test changed to the decided policy (not weakened): `os-database party-timeline-work-approval-prisma.integration.test.ts` reassigned party work to a member holding only people.admin. That is now correctly refused (`TARGET_PREREQUISITE_MISSING`). The fixture now hands the work to the account owner, who then completes it, and the timeline assertions are unchanged.

Checks (evidence `evidence/REVIEW-R4-REASSIGN-WORK-DELTA/`, allowlisted lines only; tested sources in `tested-source-manifest.sha256`):

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| HTTP + PG `review-r4-reassign-work.http.test.ts` | 8/8 |
| os-contracts `work-reassignment.test.ts` (new) | 4/4 |
| os-contracts suite | 185/185 |
| os-work suite | 22/22 |
| os-query suite | 82/82 |
| os-database suite | 303/303 after the fixture correction. Before it: 302/303 (the expected refusal). The first targeted run after the correction failed once with no captured detail; the next 3 runs passed 7/7 |
| os-api suite | 267/267 serial (`--test-concurrency=1`). The default-concurrency package script (`pnpm test`) **fails intermittently, and the cause is not established**. See §6.1 |
| os-web suite | 1300/1300 |
| Typecheck os-contracts / os-work / os-query / os-database / os-api / os-web | exit 0 each |
| Mutations | **INCOMPLETE.** The run aborted and left one mutated line, which was restored and hash-verified. Not re-run and not used as acceptance evidence (`mutations.txt`) |

Limitations, recorded as open:
- The domain workflow is incomplete: production, warehouse and purchasing reassignment is disabled until a bounded authority definition exists.
- The commercial reassignment UI is missing. Commercial managers have no product surface for ReassignWork on customer work yet; only the HTTP command exists.
- A coverage arrangement is not created by the command. The target must already hold coverage; the command never grants it.
- Mutation evidence is INCOMPLETE. A safer, inspectable method (reviewable patch files applied to a disposable copy) needs the normal approval process.
- The os-api default-parallel suite fails intermittently and the cause is not established (§6.1). The established serial command is documented below; it does not explain or excuse the parallel failures.
- The os-database targeted run failed once (6/7) with no captured detail. That failure remains unexplained.
- No manager reassignment screen exists, and there is no browser proof.

Status: **locally tested with limitations, not fully verified.** Not independently reviewed. Production, warehouse and purchasing reassignment is an incomplete workflow, not a completed feature, even though it fails closed.

### 6.1 Default-parallel os-api failures (01:36 §A)

Established serial command (evidence of record): `cd apps/os-api && OS_DATABASE_URL=<disposable> node --import tsx --test --test-concurrency=1 "src/**/*.test.ts"`.

Raw output is kept locally and is not in the repository: `/Users/carmen/projects/isalwa-evidence/r4a-2dc2745-repro/` (`raw-2dc2745/` for the original logs, `SHA256SUMS`). All runs below used isolated disposable databases cloned from `isalwa_t01_disposable` and the same code as `2dc2745` (later commits are docs only).

| Run | Result | Failing test(s) |
|---|---|---|
| Original (2dc2745 suite run) | 265/267 | `commercial-runtime.test.ts` "GET party timeline returns authorized entries without raw payload"; `query-runtime.test.ts` "GET /v1/parties returns projected search results over HTTP" |
| Repro attempts 1–2 | **no result.** Both were killed when their launching shell call ended (logs stop mid-run); they are not test outcomes | n/a |
| Repro attempt 3, run 1 (`isalwa_r4a_repro3_disposable`) | 266/267 | `query-runtime.test.ts:208` "GET /v1/work-items and /v1/approvals and /v1/attention over HTTP" |
| Repro attempt 3, run 2 | 267/267 | none |
| os-database timeline file ×3 (attempt 3) | 7/7 each | none |
| Baseline at parent `13c8a5d` (before 2dc2745), run 1, separate tree and `isalwa_r4a_baseline_disposable` | 264/265 | `rate-limit` "a concurrent burst is cut at exactly the limit" |
| Baseline run 2 | 265/265 | none |

What this shows: the default-parallel failure reproduces intermittently, and the failing test differs between runs. **It also occurs before 2dc2745** (baseline 1 of 2 runs). That is evidence the flakiness was not introduced by this change, but it does not establish the cause. Shared-database ordering is a hypothesis, not a finding. Reruns were bounded as listed; there was no rerun-until-green.
