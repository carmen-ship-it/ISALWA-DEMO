# Receipt — T03 Lane B integrator dependencies

Instruction 2026-10-19 01:49 ("continue remaining enabled T03 work, including import/customer-registration UI dependencies"). Commit `1ffe5d02`.

State: IMPLEMENTED and LOCALLY TESTED (client request shapes and contract types). Not independently reviewed, not integrated into a lane, not deployed, not browser-verified. No UI was built; the screens remain Lane B items 5–9.

## What changed

**Import wire contracts (C9).**

- `ImportReceipt` and the phone-review value shapes (`ImportPhoneValue`, `ImportPhoneResolution`, `ImportPhoneField`, `ImportPhoneProposedAction`) moved from `os-import` to `os-contracts`, so the web client can share them without a new dependency. `os-import` re-exports them, so there is one definition and no change to its callers.
- New in `os-contracts`:
  - `ImportReceiptView` (receipt + `status`);
  - `ImportPhoneReviewRow`;
  - `ImportPhoneReviewList`;
  - `ImportPhoneValueResolution`;
  - `ImportCommandResultData`, the `data` type of each import command.
- The import service's real results for `ListImportPhoneReview`, `ResolveImportPhoneValue` and `GetImportBatchReceipt` are checked against these types with `satisfies`, so contract and server cannot drift silently. No runtime change.

**`os-api-client` methods** (integrator-owned file):

- `executeImportCommand(name, payload, idempotencyKey?)`: a POST command, typed per command, never retried. `ListImportPhoneReview` returns originals: show them only on the review screen and never cache them client-side (contract C9).
- `getContactRelationshipEndPreview(partyId, contactId)` (L1).
- `getContactFollowupPreferences(partyId, contactId)` (L2).
- `getCustomerArchivePreview(partyId)` (L3).
- `getIssueCorrection(issueId)`, `listIssueCorrectionCandidates(issueId, {limit, cursor})`, `getIssueCorrectionCandidate(issueId, eventId)` (L4).
- `IssueListItem.correctionAttention` for `listIssues({view: 'correction_attention'})`.

No endpoint, field or business rule was invented: every method maps an existing route or command at its stable SHA.

## Checks

Recorded in `evidence/T03-LANE-B-DEPENDENCIES/`:

- new client test (3): exact paths, encoding, query, POST with idempotency key and no retry;
- M37 and M38 caught. M36 is equivalent (POST is never retried, whatever the flag says) and was replaced by M37.
- **Milestone not green.** os-contracts, os-import and os-web passed. os-api had 353/359: 6 intermittent connection failures in `quote-pdf.http.test.ts` ("other side closed"; no server error logged; not in the change). That file passed alone (6/6) as a diagnostic, which is not counted as a pass.

## Open

- **Import page placement** stays as assigned: inside the existing customer list surface, with no new navigation.
- **Customer registration** (`CreateParty`) already has a client method (`executePartyCommand`) and its existing form. Nothing new is needed from the integrator.
- **The quote PDF intermittent failure** is tracked in the checkpoint; the cause is unknown.
