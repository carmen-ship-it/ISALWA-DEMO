# Receipt — T03 coverage action choice in "Apoyo temporal"

First sub-task of remaining T03 (`T03.md` §9): "UI para elegir acciones cubiertas (`quote.convert`, `customer.edit`) y mostrarlas en 'Apoyo temporal'".

## 1. Problem

`GrantCustomerCoverage` already accepted `coveredActions` with a grantor rule (customer.edit needs `commercial.customer.edit`; quote.convert needs `commercial.order.convert`). The existing panel could only grant the default (`commercial.work`), did not show what an active coverage covers, and the customer detail did not tell the viewer which actions they may grant.

## 2. Change

- **Contracts:** `grantableCoverageActionsFor(grantorScopes)`, one rule for server and UI.
- **Command:** `grantCustomerCoverage` now checks the requested actions with that function. Behavior is the same as the previous loop.
- **Customer detail (`GET /v1/parties/:id`):**
  - `commercialAuthority.grantableCoverageActions` (empty unless `canManageCoverage`);
  - `activeCoverage.coveredActions`.
- **os-web:**
  - `lib/commercial/coverage-actions.ts` holds the labels and parsing;
  - `temporary-coverage-panel.tsx` adds a "Qué cubre el apoyo" fieldset and shows "Cubre: …" on the active coverage;
  - `grantCustomerCoverageAction` sends `coveredActions` and refuses an empty selection.
- **Panel copy:** "El apoyo no cambia el responsable. Solo cubre las acciones elegidas, y quien apoya necesita además su propio permiso para cada una." The old line "ni autoriza convertir cotizaciones a pedido" is no longer true once quote.convert can be chosen, so it was replaced.

## 3. Checks (evidence `evidence/T03-COVERAGE-ACTIONS-UI/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (os-api dependency graph) | exit 0 |
| Typecheck os-contracts, os-commercial, os-api, os-web | exit 0 each |
| os-commercial | 101/101 |
| os-contracts | 185/185 |
| New os-web `coverage-actions.test.ts` | 3/3 |
| New HTTP + PG `t03-coverage-actions-ui.http.test.ts` (+ T03 authority file) | 3/3 (13/13 together) |
| os-api (serial) | 300/300 |
| os-database (serial) | 305/305 |
| os-web lib + components | 1304/1304 |

Mutations (`mutations.txt`), run inline; source restored with sha256 verified:

| Mutation | Caught by |
|---|---|
| Grantor scope ignored in `grantableCoverageActionsFor` | os-web 1, HTTP 5 |
| Offer not gated on `canManageCoverage` | HTTP 1 |
| `activeCoverage.coveredActions` dropped | HTTP 1 |
| Empty selection defaults to `commercial.work` | os-web 1 |

What the HTTP test shows:
- the offer per viewer: assigner gets `[commercial.work]`; with customer.edit, `+customer.edit`; with order.convert as well, all three; the owner (not a coverage manager) gets `[]`;
- a grant outside the offer is refused with 403 and nothing is stored;
- the active coverage lists its actions to the grantor-side viewer and to the helper.

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN.
- **CROSS_LANE_COLLISION (integration dependency, lane B).** `apps/os-web/app/(app)/clientes/[partyId]/page.tsx` is in lane B's allowed set and was not edited. Until it passes two props, the panel falls back to the default choice and display (`commercial.work` only; "Cubre: Continuar oportunidades y cotizaciones"), which matches the previous behavior. The props are:
  - `grantableActions={detail.commercialAuthority?.grantableCoverageActions}`;
  - `coveredActions: detail.activeCoverage.coveredActions` in the `activeCoverage` mapping.

  Unblock: wire these at the lane B integration point, then browser-check the panel.
- The server remains the authority. The UI offer is advisory, and the command re-checks.
