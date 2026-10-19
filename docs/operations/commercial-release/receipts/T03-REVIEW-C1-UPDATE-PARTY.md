# Receipt — T03 review correction C1: UpdateParty reason, no-op, legal name

Findings 7 (legal-name edit part), 8, 9 and 10 of `REVIEW-T03-3129709.md`. Contract C1 in `contracts/T03-CUSTOMER-UI-CONTRACTS.md`.

## Change

- `UpdatePartyPayloadSchema` drops `changeKind`. `partyChangeNeedsReason` returns true for any actual change, typos included. `PARTY_CHANGE_KINDS` stays only to label events recorded before this change.
- `updateParty`:
  - a stale `expectedVersion` → `CONFLICT`, checked before anything else;
  - an exact no-op → `{ partyId, unchanged: true, version }`, no store write, no business event or audit row (idempotency record unchanged);
  - a legal-name **change** without `master_data.admin` → `PERMISSION_DENIED`; omitted or unchanged legal name needs no steward scope;
  - a change without a reason → `VALIDATION_FAILED`;
  - result `{ eventId, partyId, unchanged: false, version, changedFields }`.
- Traceability:
  - the event holds previous and new names, `changedFields`, reason, version and source;
  - the audit row holds before/after names with the before and after `version`, and no reason;
  - both share the correlation id (HTTP test asserts it).
- os-web (minimum to stay consistent): the form's reason check uses the new rule, and the help text no longer promises a typo exemption. The "Tipo de cambio" select still renders and is ignored by the API. Its removal is assigned to the UI lane (`lanes/LANE-B-T03-CUSTOMER-UI.md`).

Not in C1: legal-name **disclosure** by read authority (C3), and timeline field visibility (C2).

## Checks (`evidence/T03-REVIEW-C1-UPDATE-PARTY/`)

| Check | Result |
|---|---|
| os-party (serial) | 38/38 |
| Regressions run against the `3129709` service | 4 fail (typo without reason, no-op, unchanged legal name, legal-name permission), as expected |
| HTTP+PG authority, grant provisioning, contact phone | 24/24 on rerun; first combined run had 1 failure in the team-manager edit test, not reproduced in two reruns, detail not captured |
| os-contracts | 185/185 |
| os-web edit-reason | 3/3; tsc os-web exit 0 |

States: IMPLEMENTED, LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN.
