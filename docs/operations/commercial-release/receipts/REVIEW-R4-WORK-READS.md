# REVIEW-R4-WORK-READS — work and approval read gaps (F10 authorship half, F11; 20:03 §4)

State: IMPLEMENTED + LOCALLY TESTED (unit, disposable Postgres, local HTTP). NOT INDEPENDENTLY REVIEWED. BROWSER CHECK UNPROVEN. Part A of the R4 read gaps; F07 (commitments) is part B, not in this commit.

Rule applied (20:03 §4): work items and approvals are readable through applicable customer/account scope, assigned work responsibility, or explicit managerial/operational authority. Membership, people.admin and authorship authorize nothing. Unknowable → the same 404 as missing.

## 1. Behavior

All in `packages/os-query/src/work/work-auth.ts` (one rule, reused):

- **Work** (`canReadWork`): current owner; Compras on open purchasing prep reviews (unchanged operational rule); `canReadOwnedRecord` (commercial.team.read for direct reports, commercial.org.read); customer scope — for `party` / `commercial_account` subjects, `canReadCustomer` on that customer (account owner, active coverage, team/org read).
  - Removed: people.admin reads all work (F11); creator reads work forever (F10 authorship).
- **Approvals** (`canReadApproval`): approver or a delegate whose delegation still confers approval.act; for `quote`/`order` subjects, current read authority over the subject; for `work_item` subjects and the linked work item, `canReadWork`; for `party` subjects, customer scope. The requester keeps a read only for subject types with no subject rule (e.g. `organization_member`).
  - Removed: people.admin reads all approvals (F11); the requester reads a quote/order/work_item/party approval after losing authority over the subject (authorship).
- **List scopes:** people.admin can no longer list work by another owner or approvals by another approver (403, as before for everyone else). Managers use `visibility=team|org`.
- **`GET /approvals/subject`:** previously any `commercial.team.read` (or people.admin) holder saw every approval on any quote/order. Now `canReadOwnedRecord` on the subject owner, otherwise per-row `canReadApproval`; nothing readable → 404.
- **Detail endpoints** (`GET /work-items/:id`, `GET /approvals/:id`): unreadable → `NOT_FOUND` (was 403).
- Party timeline uses the same rules, plus its existing coverage path.
- `CustomerVisibilityLookup.partyIdForCommercialAccount` (optional; Prisma implements it). Absent → account-linked reads fail closed.
- os-api wiring: work and approval query services receive the customer lookup and direct-report lookup.

## 2. Tests changed to the decided policy (not weakened)

- `query-context.delegation.test.ts`: "org admin reads the approval" → "people.admin alone does not read the approval".
- `leadership-visibility.test.ts`, `work-projection-prisma.integration.test.ts`, `query-runtime.test.ts`: unreadable work detail expects `NOT_FOUND`/404 instead of `PERMISSION_DENIED`/403.

## 3. Checks actually run

Evidence: `evidence/REVIEW-R4-WORK-READS/`.

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| New HTTP + PG test `review-r4-work-reads.http.test.ts` | 6/6 |
| os-query suite | 82/82 |
| os-database suite | 303/303 |
| os-api suite | 259/259 |
| os-web suite | 1298/1298 |
| Typecheck os-query / os-database / os-api | exit 0 each |
| Mutations | 8/8 caught |

## 4. Open / noted

- `ReassignWork` still requires only people.admin, so people.admin can reassign a work item it cannot read (command authority, not a read; recorded for the command-authority pass).
- `CreateWorkItem` lets the creator assign work to someone else and then lose sight of it; intended under "authorship is not authority".
- Approvals on `organization_member` subjects keep the requester read (no subject rule exists).
- Timeline work entries for `commercial_account` subjects rely on the lookup above; no hosted data checked.
- os-web typecheck not run (no os-web source changed). Browser verification of work/approval screens: UNPROVEN. Independent review: pending.
