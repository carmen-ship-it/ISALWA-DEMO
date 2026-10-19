# Receipt — T03 review correction C4: bounded, listed, independently authorized coverage

Findings 13, 14 and 15 of `REVIEW-T03-3129709.md`. Contract C4 in `contracts/T03-CUSTOMER-UI-CONTRACTS.md`.

## Change

- Window:
  - `GrantCustomerCoveragePayloadSchema`: `endsAt` is required; `startsAt` is optional (default now).
  - `coverageWindowProblem` (os-contracts) refuses a missing end, a start in the past, a start more than 30 days ahead, an end not after the start, and a window longer than 30 days. The command answers `VALIDATION_FAILED`.
  - `COVERAGE_MAX_DURATION_DAYS = 30` is an **engineering default** (owner decision 2026-10-18), not a recovered customer rule. Nothing renews automatically.
- Extension and overlap: an extension is a new grant that starts when the current one ends. A window that overlaps an active **or scheduled** grant for the same helper is refused.
- Independent authority:
  - `MemberAccessSnapshot.independentScopes` holds scopes from the member's own active role assignments only. It is filled by the commercial command service and the query context.
  - `memberIndependentScopes` fails closed when the field is not set.
  - Both the grant check and the delegable actions use it, in the command and in the detail's `grantableCoverageActions`.
  - Today's delegable scopes cannot carry commercial authority, so the weaker path was not exploitable. The check is now explicit anyway.
- Owner reassignment ends scheduled grants as well as active ones (`listActiveCustomerCoverageForParty({ includeScheduled: true })`). Before this change only active grants were ended, so a scheduled grant would have survived the change of owner.
- Customer detail:
  - `coverageGrants` lists every active and scheduled grant with actions, start, end, status and per-grant `canRevoke`.
  - `commercialAuthority.canRevokeCoverage` is added.
  - `activeCoverage` stays, marked deprecated, until the customer page switches (lane B2).
- os-web:
  - `grantCustomerCoverageAction` reads `startsOn` / `endsOn` day fields (America/La_Paz). It sends `endsAt` at the local midnight after the last covered day, and `startsAt` only for a future start.
  - Missing or out-of-range days get a Spanish error before any call.
  - `coverageGrants` and `canRevokeCoverage` are added to `CustomerDetail`.

## Contract change from the published C4

- `actingAdvisorName` is dropped. The customer page already resolves member labels for the owner and helper, so the UI keeps using that resolution and no new member lookup is added.
- `primaryOwnerMemberId` is added per grant.

## Known gap until lane B2

The "Apoyo temporal" panel still has no `Desde` / `Hasta` inputs. Until B2 adds them, a grant from the current panel stops in the action with "Indique hasta qué día dura el apoyo (máximo 30 días)." No open-ended grant can be created.

## Checks (`evidence/T03-REVIEW-C4-COVERAGE/`)

| Check | Result |
|---|---|
| os-contracts, os-domain, os-commercial, os-query (serial) | 188, 239, 106, 114, all passing |
| New P6 regressions against the `6f39a90d` service | all 5 fail, as expected (file restored, sha256 identical) |
| HTTP+PG (disposable): coverage actions UI, customer authority, R4 lifecycle coverage, route auth path | 4/4, 10/10, 4/4, 1/1 |
| os-web coverage helpers | 10/10; tsc for os-api, os-commercial and os-web exit 0 |

States: IMPLEMENTED, LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN until the lane B2 panel exists.
