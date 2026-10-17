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
