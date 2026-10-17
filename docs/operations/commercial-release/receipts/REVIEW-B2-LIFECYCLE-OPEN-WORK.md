# Receipt — B2: open work no longer blocks suspension or termination

Source: 23:47 §B item 2. "Open work must not block suspension/termination. Revoke access immediately; preserve history and surface unresolved work to authorized management/queues. Missing replacement never preserves access."

## 1. Problem

- **`SuspendMember`:** refused with `VALIDATION_FAILED` while the member held open work, active quotes or direct reports (`SUSPEND_ACTIONABLE_CATEGORY_KEYS`).
- **`TerminateMember`:** refused while any blocking category was non-empty (`canTerminate: false`).

So a member who should lose access kept it until someone found a replacement for every item.

## 2. Change

**Commands (`os-workforce`)**
- `suspendMember` and `terminateMember` no longer check open work. Access is revoked in the same transaction as before:
  - suspension: status and auth access;
  - termination: also the auth identity, so the member gets 401.
- Both compute `unresolvedOwnership(impact.categories)` and record it on the `member.suspended` / `member.terminated` event payload: `{ key, count, ids (≤100) }` per non-empty category. History keeps what was still owned at that moment.
- Nothing is reassigned automatically. Unresolved items stay owned by the member, with their history intact.

**Contracts (`os-contracts`)**
- Removed `SUSPEND_ACTIONABLE_CATEGORY_KEYS`, `SUSPEND_BLOCKED_MESSAGE` and `hasSuspendActionableWork`.
- Added `UNRESOLVED_OWNERSHIP_MESSAGE`, `UNRESOLVED_OWNERSHIP_ID_LIMIT` and `unresolvedOwnership`.
- `active_delegations` joins `LIFECYCLE_ENDED_CATEGORY_KEYS`: delegations, like received coverage, end with the lifecycle change and are not "unresolved".
- `TerminationImpactReadModel` now returns `unresolvedCount` instead of `canTerminate` / `totalBlockingCount`.

**Where unresolved work surfaces (existing surfaces only)**
- **Member admin page (`/administracion/equipo/[id]`):**
  - the impact panel ("Responsabilidades") shows the unresolved message and counts;
  - suspend and terminate are never disabled; a note links to the panel when `unresolvedCount > 0`;
  - the ReassignWork panel and commercial continuity are now also shown for terminated members, so an admin can move work after termination.
- **Manager range:** direct reports come from manager assignments regardless of access status, so the member's manager keeps reading the open work and quotes (HTTP-proved below).

## 3. Checks (evidence `evidence/REVIEW-B2-LIFECYCLE-OPEN-WORK/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Typecheck os-contracts, os-workforce, os-database, os-api, os-web | exit 0 each |
| New HTTP + PG `review-b2-lifecycle-open-work.http.test.ts` | 3/3 |
| os-contracts / os-workforce / os-query / os-work / os-commercial | 185 / 145 / 114 / 22 / 101, 0 failures |
| os-database (serial, disposable PG) | 303/303 |
| os-api (serial, established command) | 289/289 |
| os-web lib + components | 1300/1300 |

Old-behaviour tests that pinned the block were flipped to the new rule, not deleted: os-workforce (suspend impact, termination preflight, adversarial access), os-api admin mutation, os-database (suspend lifecycle, work, workforce, admin mutation).

What the HTTP test shows:
- **Suspension with open work, an active quote and a commercial account:** 201. The member gets 403 at once. Ownership is untouched, and the event payload lists `open_work`, `active_quotes` and `commercial_accounts`.
- **After suspension:**
  - admin impact returns 200 without `canTerminate`;
  - the jefe (manager) reads the work and the quote;
  - an outsider gets 404/403;
  - the admin reassigns the general work item, and the unresolved count drops by 1.
- **Termination with open work:** 201. Auth is revoked and the member is terminated (401). The payload keys are recorded, the impact still lists the items, and the jefe still reads them.

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED. **Not independently reviewed.** BROWSER CHECK UNPROVEN: the member admin page wasn't opened in a browser.
- **Mutation evidence BLOCKED (SECURITY_GATE):** auto-review rejected the local mutation runner as an uninspected script. Per 02:14 it was not approved, retried or relocated (`mutations.txt`). To unblock: an inspected inline mutation run in a later task.
- **No notification or queue entry** is created for unresolved work. It surfaces through the admin page and manager range only. A dedicated management queue is a product decision (BUSINESS_DECISION_REQUIRED).
- **Quotes and orders have no reassignment command.** They stay with the departed owner, readable by the manager and coverage holders. Their transfer is a separate decision.
- Historical receipts that mention `canTerminate` describe the earlier behaviour and were not rewritten.
