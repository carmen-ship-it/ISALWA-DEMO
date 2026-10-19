# Receipt — T03 review correction C6: masked number history and justified reveal

Finding 4 of `REVIEW-T03-3129709.md`. Contract C6 in `contracts/T03-CUSTOMER-UI-CONTRACTS.md`. Builds on C5 (`1bed54a3`) association history.

## Change

- **`GET /v1/parties/:partyId/contacts/:contactId/endpoints`:**
  - Returns `{ partyId, contactId, items: [{ associationId, channel, numberMasked, startedAt, endedAt, endReason, verificationMethod }] }`, newest first.
  - Only rows of this contact on this customer. A recycled number's earlier customers never appear.
  - No full number.
  - Answers:
    - unreadable or missing customer → 404 (`readableCustomer`, T02);
    - readable but `canReviewEndpointHistory` false → 403;
    - contact not on this customer → 404.
- **`RevealContactEndpoint` command `{ partyId, contactId, associationId, justification }`:**
  - Justification is trimmed, 10–500 characters.
  - Authority is the customer `edit` rule, the same as the endpoint commands.
  - The association must belong to that contact and customer; otherwise 404. The new holder of a recycled number therefore cannot reveal the earlier holder's row.
  - Result `data = { eventId, associationId, number }`.
  - Event and audit `contact.endpoint.revealed` record actor, association, channel and justification, never the number.
  - The event type is not in the party event list, so no timeline projects it.
  - The result is never stored for idempotent replay, so no full number lands in the idempotency table. Reusing a key on a reveal answers `CONFLICT` instead of replaying, and each reveal needs its own request and audit.
- **Flags:** `canReviewEndpointHistory` and `canRevealEndpoint` = the customer edit rule. This includes merged customers, since reading history is not a mutation.
- **os-web:**
  - `listContactEndpointHistory(partyId, contactId)` on the API client, typed `ContactEndpointHistoryResponse`.
  - `buildRevealContactEndpointPayload` validates the reason in Spanish.
  - `revealContactEndpointAction` returns `{ ok, number }` once and revalidates no page.
  - No UI yet (lane B2).

## Engineering defaults for review

- Who reviews and who reveals is the customer edit rule: owner, team lead over the owner, `commercial.org.read` editors, coverage with `customer.edit`, and data stewards who can read the customer. There is no extra reveal permission. The owner decision asked for "authorized", and this is the existing commercial edit authority.
- The justification is stored in the restricted event and audit, visible to audit readers.

## Checks (`evidence/T03-REVIEW-C6-ENDPOINT-HISTORY/`)

| Check | Result |
|---|---|
| Builds: os-contracts, os-party | exit 0 each |
| Typecheck: os-api, os-web | exit 0 each |
| `t03-contact-phone.http` (3 new C6 cases) | 11/11 |
| Flags HTTP | 5/5 |
| os-party, os-contracts | 38/38, 192/192 |
| os-web phone and self-service | 19/19 |

Mutations were each caught:
- history returning full numbers (2 failing);
- history authority check removed (1);
- reveal result stored for replay (1).

The sources were restored with identical sha256.

## States

IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN, because there is no history or reveal UI until lane B2.
