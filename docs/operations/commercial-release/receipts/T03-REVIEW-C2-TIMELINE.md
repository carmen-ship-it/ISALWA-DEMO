# Receipt — T03 review correction C2: field-level visibility on the customer timeline

Finding 11 of `REVIEW-T03-3129709.md`. Contract C2 in `contracts/T03-CUSTOMER-UI-CONTRACTS.md`.

## Change

- Every item from `GET /v1/parties/:partyId/timeline` now carries `detail: 'full' | 'summary'`.
- Customer-field events go to `summary` for viewers who may not edit the customer. The rule is the same as C3's legal-name read: customer editors, and data stewards who can open the record. The summary keeps only these keys:
  - `party.created`: `partyId`, `partyKind`, `initialRoleKey` (no historical name);
  - `party.updated`: `partyId`, `changedFields`, `version`, `source` (no names, change kind or reason);
  - `party.fiscal_identity.changed`: `partyId` (no NIT or razón social);
  - `contact.updated`: `contactId`, `organizationPartyId` (no contact names);
  - `contact.phone.changed` / `contact.phone.retired`: `partyId`, `contactId`, `reason` (code), `version` (no masked numbers, free-text note or verification).
- The query fails closed: `listPartyTimeline` returns summaries unless the caller passes `fieldDetail: true`. The controller decides that from `customerAuthorityFlags`.
- Unchanged:
  - Commercial-record events (quotes, orders, work, approvals) keep their per-record visibility and facts.
  - Full phone numbers never appear in any timeline response. The timeline stores masked numbers only.
- os-web: `timelineEntrySummary` renders summary entries as what changed, for example "Cambió: Nombre · Versión 3 · Detalle visible para quien puede editar este cliente". It never shows empty arrows or values.

## Checks (`evidence/T03-REVIEW-C2-TIMELINE/`)

| Check | Result |
|---|---|
| HTTP+PG: the editor gets full detail; the org reader and the commercial-work-only coverage helper get summaries; the raw body has no historical name, reason text, number or contact name | 5/5 (file shared with C3) |
| Timeline-reading HTTP suites, once | 8, 4, 4, 6, 8, 10, all passing |
| os-query | 115/115 |
| Regression against the `f11991fd` controller and query | C2 case fails, as expected; files restored, sha256 identical |
| os-web labels | 51/51; tsc for os-api and os-web exit 0 |

States: IMPLEMENTED, LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN.
