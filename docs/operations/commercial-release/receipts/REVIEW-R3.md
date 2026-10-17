# Review task R3 — Tenant selection (F09)

Governing decisions: owner messages 2026-10-16 20:03 (§7, §13.8 #3) and 20:39 ("Continue F10, then F09"). Base: `41bdb2e` (R2). State: **IMPLEMENTED + TESTED (unit, disposable Postgres, local HTTP)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed.

## 1. Server: options come only from proven membership

- `os-domain` `listEligibleOrganizations`: same identity proof and membership lifecycle rules as `resolveTrustedMemberContext` (shared `provenPerson`). Returns organization ids only; no member ids, roles or scopes. No eligible membership but an inactive one → `MEMBER_INACTIVE`.
- `os-api` `GET /v1/session/organizations`: `{ organizations: [{ organizationId, legalName }] }`. The selector header is ignored and never widens the list. Classified in `inspection-reads.adversarial.test.ts`.
- `OsWorkforceStore.listOrganizationsByIds` (memory + Prisma) for display names only.
- Unchanged and re-proven: the canonical session accepts `x-os-organization-id` only as a choice among the person's active memberships. Several memberships and no selector → `TENANT_FORBIDDEN`; a foreign, unknown or stale selector → 403.

## 2. Web: membership-derived selection

`apps/os-web/lib/auth/organization-selection.ts` `resolveOrganizationSelection(options, previous)`:

| Memberships | Previous choice | Result |
|---|---|---|
| none | any | honest no-access state (`NoOrganizationState`); sign-in refuses with the no-membership message |
| one | any (even stale or tampered) | that organization |
| several | still an option | that organization |
| several | none | chooser (`OrganizationChooser`) |
| several | stale or tampered | chooser with "ya no está disponible" copy |

- `getServerOsAuthContext` sends the selector only from that result. Options are fetched from `/session/organizations` once per request (React `cache`). This adds one os-api read per server request.
- The two hard-coded ids (`QA_REAL_ORGANIZATION_ID`, `QA_SYNTH_ORGANIZATION_ID`) are no longer in the organization path. `lib/demo/owner-company-context.ts`, its cookie (`isalwa-owner-effective-company`) and the sign-in REAL→SYNTH probe are removed. The constants remain for QA "Ver como" only.
- Selection cookie `isalwa-selected-organization`: httpOnly, set only by server code — at sign-in, or by `selectOrganizationAction` after the server re-lists the caller's memberships and confirms the requested id is one of them. It is a preference, not authority: os-api re-validates the selector on every request. It is cleared on sign-out.
- Switching: user menu "Cambiar empresa" (only when there is more than one membership) opens `/empresa`. After a successful switch the client clears session storage and does a full document navigation. That drops React state, the router cache, polling and subscriptions. Persistent keys that hold tenant data (recents, saved views, role preview, guide) are already scoped by `organizationId:memberId` and rekey on their own.
- Dev mode (development profile only): with several memberships and no choice, the dev session's own organization is kept. os-api still validates it.

## 3. Journey neutrality

- `openStory` no longer sets demo mode or writes `datos=demo`. Opening the Journey via `?story=1` no longer forces demo mode. Journey step links carry no `datos=` parameter. The Inicio card link is `/inicio?story=1`.
- Demo / Datos reales remains a filter inside the selected organization (full removal stays in T10/T11). It no longer selects an organization; middleware no longer writes a company cookie.
- `DemoFictitiousBanner` shows only in demo data mode. Previously it also showed whenever the Journey was open, which would now label real data as fictitious. The Inicio card copy no longer promises fictitious data.
- Consequence for T10/T11: Journey steps still resolve against the DEMO MADERAS seeded ids. In an organization without those records the links reach the normal not-found and denial states. Content is untouched here.
- Behavior change: a person who used the Demo toggle to see the SYNTH organization now chooses it with "Cambiar empresa". This applies only if they hold an active SYNTH membership. No membership or access was granted to anyone.

## 4. Proofs

| Claim | Evidence |
|---|---|
| One membership → that org, no selector needed | HTTP R3 test 1 |
| Several → both listed, session requires selection, each selection maps to its own member | HTTP R3 test 2 |
| List exposes only `organizationId` + `legalName` | HTTP R3 test 2 |
| Foreign/unknown selector refused; tenant data read with it refused; list never widened | HTTP R3 test 3 |
| Stale (suspended) membership: selector refused, org leaves the list, remaining one used | HTTP R3 test 4 |
| No eligible membership → `ACCESS_REVOKED`, no org chosen | HTTP R3 test 5 |
| Unauthenticated → 401 | HTTP R3 test 6 |
| Web selection rules, switch validation, storage clearing | `organization-selection.test.ts` (7 rule tests) |
| No hard-coded ids or data-mode input in the organization path; Journey writes no data mode | `organization-selection.test.ts` (2 source tests) |

Mutation checks (`evidence/REVIEW-R3/mutation-*.txt`), each reverted after the run:
- `web-auto-picks-first-org` (several memberships → first) → 2 failing tests.
- `journey-forces-demo` (`openStory` sets demo) → 1 failing test.
- `api-lists-inactive-memberships` (lifecycle ignored) → 2 failing HTTP tests.

## 5. Checks, reported separately

- Package build (`pnpm --filter @isalwa/os-api^... --filter !@isalwa/database run build`): exit 0.
- Typechecks: os-web 0, os-api 0, os-database 0.
- Suites (failures): os-domain 239 (0), os-workforce 133 (0), os-database 299 (0, disposable PG), os-api 229 (0, disposable PG; +6 R3), os-web 1294 (0).
- Not rerun (untouched by R3): contracts, commercial, party, work, issue, commitment, import, events, query, request-session. The R2 results stand.
- Legacy `apps/api` canonical-session.bootstrap failure: unchanged, outside the os-api graph (see R2 §4).
- Evidence: `evidence/REVIEW-R3/` (allowlisted ✔/✖/ℹ lines, exit codes, `tested-source-manifest.sha256`).

## 6. Expectation changes

- `lib/demo/owner-demo.test.ts`: two story-step tests asserted `datos=demo` on Journey links. They now assert no `datos=` parameter (owner decision 20:03 §7).
- `lib/demo/owner-company-context.test.ts`: removed with the module it tested (hard-coded REAL/SYNTH mapping).
- `inspection-reads.adversarial.test.ts`: classification row for `GET /session/organizations`.

## 7. Remaining

- BROWSER-VERIFIED: UNPROVEN. Needs a local or hosted check with a synthetic multi-membership identity. Chooser, switch (no previous-tenant data after switch), single-membership path, no-access state, Journey open and close leaving organization and data mode unchanged.
- Transfer/push blocker (20:39 §5) still applies to this branch.
