# Receipt — B1: minimal advisor option in the provisioning plan, and ongoing onboarding

Source: 23:47 §B item 1. "Add a minimal advisor option to the multi-holder provisioning plan. No people.admin or organization-wide powers by default. Prove advisor registration → quote → eligible conversion using synthetic identities. Verify safe ongoing onboarding too; bootstrap alone is insufficient."

State: IMPLEMENTED + LOCALLY TESTED (disposable Postgres, synthetic identities). **NOT EXECUTED** for any real organization or person. NOT INDEPENDENTLY REVIEWED.

## 1. Change (same plan module, no parallel path)

`packages/os-database/src/ops/initial-commercial-bootstrap.ts`:
- **New range `own`:** the holder's own customers and quotes only. No read range, no direct reports; listing direct reports is refused (`INVALID_INPUT`).
- **New proposal `advisor`:** range `own`, scopes `commercial.customer.create` and `commercial.quote.convert.own`.
  - No people.admin, no organization-wide scope and no read range.
  - No `commercial.order.convert`; conversion is own submitted quotes only.
  - Holders may take a subset.
- **Manager proposals (`team_manager`, `commercial_manager`)** may also include the two advisor scopes (optional subset).
  - Why: under independent possession, a grantor must hold a scope in their own right to grant it. Without this, nobody could grant advisor scopes to a later advisor after the plan.
  - **POLICY choice for owner review:** a manager who takes them can register customers and convert their own submitted quotes.
- **Invariant test updated:**
  - proposals have at most 5 scopes;
  - none includes people.admin, `commercial.assignment.org`, `commercial.order.convert` or `commercial.account.reassign`;
  - range is `organization` exactly when an org-wide scope is present.

## 2. Ongoing onboarding (no plan, no new mechanism)

A later advisor is onboarded with existing commands:
1. **Invite:** RRHH (people.admin) uses `InviteMember` with a job title (`sales_rep`), then `ActivateMember`. The new member holds no permission.
2. **Grant, dual control:**
   - RRHH alone is refused (does not hold the scopes).
   - The Gerente alone is refused (no people.admin).
   - RRHH gives the Gerente a time-boxed `people.admin` delegation (`GrantDelegation`). The Gerente, who holds the advisor scopes in their own right, uses `GrantAdditionalRole`. RRHH then revokes the delegation, and the Gerente's next grant is refused.
3. **Grant checks still apply:** own possession, reach within the grantor, and no self-grant.

**Limitation:** while the delegation is open, the Gerente has full people.admin, not only the grant. The window is bounded by `expiresAt` and closed by `RevokeDelegation`. A narrower "grant advisor scopes" permission would be a new scope, so it is a decision (BUSINESS_DECISION_REQUIRED).

## 3. Checks (evidence `evidence/REVIEW-B1-ADVISOR-PROVISIONING/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Typecheck os-database, os-api | exit 0 each |
| Plan integration test (disposable PG; 2 new) | 9/9 |
| New HTTP + PG `review-b1-advisor-provisioning.http.test.ts` | 3/3 |
| os-api (serial) | 295/295 (an earlier run had one timing failure in the unrelated rate-limit test; passes alone) |
| os-database (serial) | 305/305 (an earlier run tripped the no-app-import guard via a comment in the new os-api test; comment reworded) |

Mutations (`mutations.txt`), run inline; source restored with sha256 verified:

| Mutation | Caught by |
|---|---|
| M1: advisor gets team range | plan test 2 |
| M2: advisor also offers `commercial.org.read` | plan test 3 |
| M3: own range accepts direct reports | plan test 1 |
| M4: managers cannot hold advisor scopes (no ongoing grantor) | plan test 2 |

**Plan test (os-database):**
- Refused before any write:
  - advisor with direct reports;
  - advisor with range `team`;
  - advisor asking for `commercial.org.read`, `commercial.team.read`, people.admin or `commercial.order.convert`.
- With a Gerente taking the advisor scopes:
  - asesor 1 ends with exactly create plus convert.own;
  - asesor 2 ends with a create-only subset;
  - no advisor holds people.admin, any `.read` or any org-wide scope;
  - no team is created for an advisor.

**HTTP test (os-api):** the plan's role rows are written with its deterministic ids, because apps may not import the plan module.
- **Plan advisor:**
  - registers a customer, creates a quote and cannot convert it while draft;
  - adds a line, submits and converts (201), and remains the quote owner;
  - `GET /v1/members` returns 403 and `InviteMember` returns 403.
- **A second advisor's quote:**
  - conversion by the first advisor is refused;
  - detail returns no data (owner gets 200).
- **Ongoing onboarding:** the steps in §2, then the new advisor completes the same journey. The conversion event is recorded with the new advisor as actor.

## 4. Status, limitations, findings

- IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Real execution NOT AUTHORIZED (holders, approval reference and operator come from the owner). Browser: UNPROVEN (no UI change).
- **New finding (NEW-B1-D1, disclosure):**
  - `GET /v1/quotes/:id` answers 403 `PERMISSION_DENIED` for another member's quote, but 404 `NOT_FOUND` for a missing id. This is an existence oracle.
  - Opportunity and order detail use the same pattern (`commercial-query-service.ts` `getOpportunity`, `getQuote`, `getOrder`), and quote PDF goes through `getQuote`.
  - Not fixed here. It is the next task, ahead of remaining T03, because it is a confirmed disclosure defect.
