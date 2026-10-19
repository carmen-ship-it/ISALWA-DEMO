# Receipt — T03 review recheck C8: delegated data steward

Finding 16 of `REVIEW-T03-3129709.md`: "Keep the policy; verify grantor, scope and lifetime through canonical current authority." Verification only. No product source changed.

## Path verified

1. `GET /v1/master-data/parties` and `/:partyId` (`master-data.controller.ts`) build the query context (`buildQueryContext`) and require `memberHasScope(ctx.auth, 'master_data.admin')`.
2. `buildQueryContext` loads the member's delegations through `listDelegationsForDelegate`, which includes `DELEGATOR_STANDING_INCLUDE` (the grantor's access status, company and role assignments). It then computes scopes with `computeEffectiveScopes`.
3. `delegationConfersScope` (os-domain, F10) is evaluated at use time. A delegated scope counts only when all of these hold:
   - the delegation is not revoked;
   - `startsAt ≤ now < expiresAt`;
   - the scope is delegable and named in the delegation;
   - the grantor is an active member of the delegation's company;
   - the grantor holds the scope through their own role assignment, active now.
   A received delegation never counts as the grantor's own role, so it cannot be passed on.

`master_data.admin` stays in `DELEGABLE_SCOPE_KEYS` (policy kept).

## New regression test `t03-steward-delegation.http.test.ts` (4/4)

- Steward by role reads; a member with nothing is refused.
- A current delegation from an active steward confers the lookup. It stops when the grantor's role ends or the grantor is suspended, and returns when they are restored. It stops when the delegation is revoked.
- Refused when the delegation is expired, not started, does not name the scope, or comes from a grantor without the scope or from another company.
- A delegated steward who delegates again confers nothing.

Mutations of `delegationConfersScope` were each caught, with os-domain rebuilt every time:
- dropping the grantor role check (3 failing);
- dropping the window check (1 failing).

The source was restored with identical sha256. Evidence: `evidence/T03-REVIEW-C8-STEWARD-DELEGATION/`.

## States

TESTED locally: policy confirmed, regression added. Not independently reviewed. All delegations in the test are synthetic rows in the disposable database. No real grant was made.
