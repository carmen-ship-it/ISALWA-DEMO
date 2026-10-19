# Receipt — T03 review correction C7: identity review resolution for recycled numbers

Completes finding 3 of `REVIEW-T03-3129709.md`. C5 (`1bed54a3`) records the dated history and opens the review. C7 adds the authorized resolution and closes stale reviews. Contract C7 in `contracts/T03-CUSTOMER-UI-CONTRACTS.md`.

## Change

- **`ResolveContactIdentityReview` `{ partyId, contactId, expectedVersion, channel, decision: 'confirmed' | 'rejected', verificationMethod, note? }`:**
  - `expectedVersion` is added to the published C7 payload, for the same version check as the other endpoint commands.
  - Authority is the customer `edit` rule, with the usual non-disclosure answers (404 unknowable, 403 readable without edit).
  - Needs an active, unmerged customer, an active contact, the channel status `identity_review`, and an open review on that channel. Otherwise `VALIDATION_FAILED`.
  - `confirmed` sets the channel status to `unverified`, so the number is in use but not verified.
  - `rejected` retires the number: number, display and status are cleared, retired reason `identity_rejected`, and the association ends with `identity_rejected`.
  - The review row records status, resolver, time, verification method and note.
- **Superseded:** changing or retiring a channel's number closes any open review on it as `superseded`, with resolver and time. A decision afterwards is refused. Migration `20261018230000_os_contact_identity_review_superseded_t03` widens the status check.
- **Event `contact.identity_review.resolved`:**
  - Payload: channel, decision, verification method, note and version only. No number, no earlier customer, contact or association.
  - Audit before/after hold status only.
  - The event is on the customer timeline. Full detail goes to customer editors; the C2 summary shows channel, decision and version.
  - `identityReviewRequired` is now an allowlisted fact on `contact.endpoint.changed`.
- **No leak:** the new holder's detail, timeline, history (C6) and command responses never include the earlier customer's id, name, contact or association. The earlier holder's history row cannot be revealed through the new holder (C6 test).
- **Flag:** `canResolveIdentityReview` = customer edit rule on an unmerged customer.
- **os-web:**
  - `buildResolveContactIdentityReviewPayload` and `resolveContactIdentityReviewAction` (form fields `partyId`, `contactId`, `expectedVersion`, `channel`, `decision`, `verificationMethod`, `note`).
  - `IDENTITY_REVIEW_NOTICE` holds the owner's wording.
  - Timeline line: "Teléfono: identidad confirmada, número en uso · Verificación: …".
  - No UI yet (lane B2).

## Not done here

- No automatic conversation linking, as decided. Provisional conversations from a new number (A2 §62) need the conversation intake, which is not in this lane.
- Outbound behavior toward a number under review is pending T12. No sending exists.

## Checks (`evidence/T03-REVIEW-C7-IDENTITY-REVIEW/`)

| Check | Result |
|---|---|
| Builds: os-contracts, os-party, os-database, os-query | exit 0 each |
| Typecheck: os-api, os-web | exit 0 each |
| New `t03-identity-review.http` | 6/6 |
| Flags and endpoint HTTP | 5/5, 11/11 |
| os-party, os-contracts, os-query | 38/38, 192/192, 115/115 |
| os-web phone and self-service | 20/20 |

Mutations were each caught by one failing test:
- confirm leaving the number under review;
- change not superseding;
- the event naming the earlier association.

The source was restored with identical sha256.

## States

IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN, because there is no review notice or decision UI until lane B2.
