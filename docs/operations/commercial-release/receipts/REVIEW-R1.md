# Review task R1 — Grant provisioning (F03/F04)

Governing decision: owner message 2026-10-16 20:03 §3 (recorded `REUSE_MAP.md` §13, task order §13.8 #1). Base: `508f341`. State: **IMPLEMENTED + TESTED (unit, disposable Postgres, local HTTP)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed.

## 1. Grant paths inspected

| Path | Before | After |
|---|---|---|
| `GrantAdditionalRole` | `people.admin` + allowlist only; no possession check; self-target allowed; duplicate early return before any check | self-target → 403; `assertRoleKeyAssignable` (independent possession on a `delegations:false` snapshot) runs before the duplicate return |
| `ChangeRole` | possession checked; client `effectiveAt` accepted (backdating) | possession unchanged; past `effectiveAt` → 400 VALIDATION_FAILED |
| `ChangeManager` | self-as-manager allowed; member as own manager allowed; client `effectiveAt` accepted | tenant lookups first (foreign ids stay 404); member = manager → 400; manager = actor → 403 (would confer team range on self); past `effectiveAt` → 400 |
| `InviteMember`, `RehireMember` | possession checked | unchanged |
| `GrantDelegation` | self blocked; `assertScopesDelegable` (allowlist + possession) | unchanged; delegator status/possession at read time is R2 (F10) |

Job titles (`sales_rep`, `sales_manager`, …) confer no authority (`roleKeysThatConferAuthority`), so assigning them stays a people-admin act.

## 2. Legitimate combinations

`ADDITIONAL_ASSIGNABLE_SCOPE_KEYS` now also lists `commercial.customer.create|edit|archive|reactivate`, `commercial.work.manage`, `commercial.assignment.org`, `commercial.intake.assign` (`COMMERCIAL_ACTION_ASSIGNABLE_SCOPE_KEYS`). They coexist as separate additional assignments, so a manager can hold edit + work + range together without a one-role limit. The grantor must hold each one; a drift test pins the literals to the authoritative `operations-scopes.ts` constants and excludes admin, technical, reserved and delegable-only scopes. Spanish labels added in `apps/os-web/lib/workforce/labels.ts`; the existing people panel lists them from the same constant.

## 3. Initial-provisioning dependency (recorded separately)

Under independent possession, the first holder of each commercial scope cannot be created through these commands; a `people.admin` alone cannot. It must come from an out-of-band, audited owner action or seed. This task does not create one, does not auto-assign anyone, and does not fabricate a superuser. Tests use synthetic grantors seeded by fixture. Hosted grant inventory: UNVERIFIED (staging forbidden in this lane). **Dependency: owner-approved initial holders per scope.**

## 4. Evidence (`evidence/REVIEW-R1/`)

| Suite | Result | Log |
|---|---|---|
| build (`os-api^...`) | 0 | `build.log.txt` |
| os-contracts | 181/0 | `run-os-contracts.log.txt` |
| os-workforce | 128/0 | `run-os-workforce.log.txt` |
| os-domain | 232/0 | `run-os-domain.log.txt` |
| os-commercial | 101/0 | `run-os-commercial.log.txt` |
| os-party | 34/0 | `run-os-party.log.txt` |
| os-query | 77/0 | `run-os-query.log.txt` |
| os-database (disposable PG) | 292/0 | `run-os-database.log.txt` |
| os-api (local HTTP + PG) | 217/0 (incl. 7 new R1) | `run-os-api.log.txt` |
| os-web | 1288/0 | `run-os-web.log.txt` |
| os-api tsc | clean | `tsc-os-api.log.txt` |
| os-web tsc | only known TS5097 (T02 §baseline) | `tsc-os-web.log.txt` |

HTTP + Postgres proof `apps/os-api/src/review-r1-grant-provisioning.http.test.ts`:
1. `people.admin` alone: `GrantAdditionalRole` of team.read/customer.edit/work.manage/assignment.org/order.convert to another member and to self, `ChangeRole` to each, `ChangeManager` naming self → all `403 {code:PERMISSION_DENIED}`; role, manager and event row counts unchanged.
2. A grantor granting to self a scope it holds → 403, no rows.
3. Before provisioning the candidate cannot edit or quote.
4. Authorized grantor provisions candidate with team.read + customer.edit + work.manage (3 × 201) and `ChangeManager`; `ChangeRole` path provisions a read-only manager.
5. Provisioned manager `UpdateParty` + `CreateQuote` over HTTP (201); quote and account owner stay the seller.
6. Read-only manager: `UpdateParty`/`CreateQuote` 403, party version and quote count unchanged.
7. Provisioned manager cannot pass scopes on (403, no rows).

Mutation checks (each makes the proof fail, then restored):
- `mutation-grant-without-possession.log.txt` — drop `assertRoleKeyAssignable` from `GrantAdditionalRole` → test 1 fails.
- `mutation-self-manager-allowed.log.txt` — drop the self-manager check → test 1 fails.

Unit: `os-workforce/src/additional-role.test.ts` "Grant provisioning escalation (F03/F04)" (4 tests) and the existing grant tests now use a grantor that holds the scopes; `people.admin`-only grantor is denied. PG: `workforce-admin-mutation-api` adds "ChangeManager denies appointing yourself and writes nothing"; `workforce-prisma` lifecycle asserts the self-manager denial and uses a separate manager.

## 5. Expectation changes (and why)

- `additional-role.test.ts`: grants by a `people.admin`-only admin were the defect; the harness grantor now holds the scopes; "does not give people.admin the capability" now asserts the denial.
- PG `ChangeManager succeeds` / lifecycle: admin appointed themselves manager (now denied); they now appoint a separate in-org member.

## 6. Defects found in earlier own commits while running wider suites

| Defect | Introduced | Fix | Evidence |
|---|---|---|---|
| `os-query` package build failed: new master-data tests called `searchMasterDataParties` without required `limit` (build compiles tests). T03 part 3 run5 "tsc clean" covered os-api only. | `7f9286f` | add `limit: 20` in 3 test calls | `build.log.txt` (0), `run-os-query.log.txt` |
| 3 os-web tests (`pedido-access`, `pedido-case`, `role-homes`) built coverage grants without the now-required `coveredActions`; os-web was not in the T03 runs. | `1d20081` | pass `['commercial.work']` (the default the panel grants); intent unchanged | `run-os-web.log.txt` |

From now on each task's evidence run includes os-web and every package build.

## 7. Not done here

Delegator status at read time (R2/F10), tenant selection (R3/F09), read gaps (R4), inherited conversion (R5), UI (R6). Hosted grants UNVERIFIED.
