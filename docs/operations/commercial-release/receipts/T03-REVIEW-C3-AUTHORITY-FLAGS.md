# Receipt — T03 review correction C3: customer authority flags and legal-name disclosure

Findings 6 and 7 (disclosure part) of `REVIEW-T03-3129709.md`. Contract C3 in `contracts/T03-CUSTOMER-UI-CONTRACTS.md`.

## Change

- `customerAuthorityFlags` (os-party, next to `assertPartyCommandAuthority`) computes the C3 flags with the same rule the customer `edit` commands enforce: `master_data.admin`, or `canActOnCustomer('edit')`.
  - `canActOnCustomer('edit')` means `commercial.customer.edit` plus range: org read, the owner, a team lead over the owner, or coverage that covers `customer.edit`.
  - `canEditDisplayName`, `canEditContacts` and `canChangeEndpoints` follow that rule. They are false for merged parties.
  - `canEditLegalName` additionally requires `master_data.admin`, as `UpdateParty` does.
  - `canReviewEndpointHistory`, `canRevealEndpoint` and `canResolveIdentityReview` are **false** until the C6/C7 commands exist, so no UI offers a control without a backend.
- Legal-name read rule. This is an **engineering default, pending owner confirmation**:
  - A viewer who may edit the customer, or a data steward who can open the record, reads the legal name.
  - Other readers (org or team read without edit, coverage limited to commercial work, an owner without `commercial.customer.edit`) get `party.legalName: null` on `GET /v1/parties/:partyId`.
  - `GET /v1/parties` (search) returns `legalName` only to `master_data.admin` holders. Editors read theirs on the detail.
  - Steward endpoints (`/v1/master-data/...`) already require `master_data.admin` and are unchanged.
- A steward without a commercial read scope still gets 404 on the commercial customer detail. This is the unchanged T02 boundary, now pinned by a test.
- os-web:
  - Customer edit actions now go straight to the API, which applies the customer rule. These are: name, contact, phone change and retire, and location create/update/deactivate. Before, a `master_data.admin` pre-check (`adminClient`) refused owners and editors with coverage.
  - Customer **creation** keeps its existing gate.
  - `updateCustomerAction` sends `legalName` only when the form has that field, so omitting it never clears or "changes" it.
  - `CustomerDetail.customerAuthority` is added to the types.

## Not done here (assigned)

- The customer page still decides which edit controls to show from `actorCanMutateMasterData`. Switching it to `customerAuthority` is page wiring for lane B2 (`lanes/LANE-B-T03-CUSTOMER-UI.md`). Until then, owners and editors with coverage can act through the API, but the page doesn't yet offer them the controls. This is **not** a completed user workflow.
- Tracked limitation: party search matches on a shared search text that includes legal name, tax ID (NIT), razón social and contact phones. A reader can't see those values, but a query that matches only on them still returns the customer. Removing that match needs per-viewer search fields in the projection, which is a separate change.

## Checks (`evidence/T03-REVIEW-C3-AUTHORITY-FLAGS/`)

| Check | Result |
|---|---|
| HTTP+PG flags (new): editors, steward with read, readers, coverage limited to work, owner without edit, outsider, command agreement | 4/4 |
| HTTP+PG existing customer authority | 10/10 |
| os-query, os-party (serial) | 115, 38 |
| Regressions against `bc211fdd` controller and search | 3 of 4 flags tests fail, search legal-name test fails, as expected; files restored, sha256 identical |
| os-web party actions and edit reason | 17/17; tsc for os-api and os-web exit 0 |

States: IMPLEMENTED, LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN, because the page wiring is lane B2.
