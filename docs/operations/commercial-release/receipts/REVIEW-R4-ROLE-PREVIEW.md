# Review R4 — role-change preview uses the command's authorization rules

Governing decision: owner message 2026-10-16 22:29, decision 4, from `RE-REVIEW_R3_R2F.md` §5 (P3). Base: `0316531b0575749383f409f18729d476caa70700`. State: **IMPLEMENTED + TESTED (unit, disposable Postgres, local HTTP)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed.

## Behavior

- `WorkforceCommandService.authorizeRoleChange` holds every rule `ChangeRole` applies before writing:
  - `ChangeRole` authority;
  - member in the organization;
  - backdating and revoke-list validation;
  - possession (`assertRoleKeyAssignable`);
  - the shared plan (no commercial scope as primary; only held additional grants can be revoked);
  - `EndAdditionalRole` authority when revoking;
  - grantor reach.
- `ChangeRole` and the new read-only `previewRoleChange` both call it. The check order of the command is unchanged.
- `GET /v1/members/:memberId/role-change-preview` now calls `previewRoleChange` with the request session:
  - Allowed: `{ allowed: true, …plan }`.
  - Predictably refused: `200 { allowed: false, refusal }` with no plan. Refusal codes are `not_authorized`, `role_reserved`, `role_invalid`, `scope_not_held`, `commercial_scope_not_primary`, `revoke_not_held`, `cannot_end_additional` and `reach_beyond_grantor`.
  - The people.admin gate (403), foreign member (404) and missing role (400) are unchanged.
- `RoleChangeRefused` keeps the command's error code as its message, so command responses are unchanged.
- Execution re-runs the full check in its own transaction. An allowed preview grants nothing.
- os-web `role-change-form.tsx` shows "No se puede hacer este cambio: …" with a Spanish reason (`lib/workforce/role-change.ts` `roleChangeRefusalMessage`). Confirmation stays disabled unless the loaded preview is allowed.
- `reach_beyond_grantor` is kept for completeness. Since `3520dfe` a commercial scope cannot become primary and reach comes only from commercial scopes, so this refusal is practically unreachable through `ChangeRole`.
- `cannot_end_additional` currently needs the same scope as `ChangeRole` (people.admin), so it cannot occur on its own.

## Tests

- HTTP+PG `review-r2b-role-change.http.test.ts` 8/8 (2 new):
  - for each refusal the actor can reach (`scope_not_held` twice, `commercial_scope_not_primary`, `role_invalid`), the preview reports it and the command returns the matching error with no rows changed;
  - an allowed preview, then the actor loses people.admin, then the command → 403 with no change.
- Expectation changes in the same file:
  - an unheld revocation now previews as `200 allowed:false revoke_not_held` with no plan (was 400);
  - the allowed preview asserts `allowed: true`.
- os-web `lib/workforce/role-change.test.ts` 4/4 (2 new): Spanish reasons with a neutral fallback; the form shows the refusal and enables confirmation only for an allowed plan.

## Build, suites, typechecks (reported separately)

Package build (`os-api^...`): exit 0.

| Suite | Result |
|---|---|
| os-workforce | 145/0 |
| os-api (local HTTP + PG) | 253/0 |
| os-web | 1298/0 |

Typechecks (`tsc --noEmit`): os-api, os-web, os-workforce — all exit 0.

## Mutation checks (each source restored from a file backup and verified)

| Mutation | Caught by |
|---|---|
| preview computes the plan without the command's authority checks (the pre-fix behavior) | r2b HTTP 1 fail |
| form enables confirmation for a refused preview | os-web role-change 1 fail |

Evidence: `evidence/REVIEW-R4-ROLE-PREVIEW/` (allowlisted ✔/✖/ℹ lines, exit codes, `tested-source-manifest.sha256`).

## Not done / unproven

Browser verification of the form (refusal message, disabled button): UNPROVEN.
