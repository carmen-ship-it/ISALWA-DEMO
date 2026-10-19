# Receipt — T03 review correction C5: one boundary for phone and WhatsApp, with dated history

Findings 1, 2 and 5 of `REVIEW-T03-3129709.md`, plus the history and review-opening part of finding 3. Contract C5 in `contracts/T03-CUSTOMER-UI-CONTRACTS.md`.

## Change

- **One number contract (os-contracts `party-commands.ts`):**
  - `ContactNumberInputSchema = { country, number }`. `CONTACT_PHONE_COUNTRIES = ['BO']`.
  - `normalizeContactNumber` returns E.164 or null. It accepts separators and the country's own prefix (`+591`, `00591`).
  - It refuses another calling code, and digits that would only fit after guessing a country. For example, `59171111456` without `+` is refused. The country is never inferred from the digit count.
  - `maskContactNumber` keeps the last three digits.
  - The contract is used by `CreateParty.phone`, `UpdateContact.phone` / `.whatsapp` (new contacts only) and `ChangeContactEndpoint.newNumber`. A raw string is refused on every path.
  - The text as entered is kept separately in `phone_display` / `whatsapp_display` and in the association's `entered_text`.
- **Commands:**
  - `ChangeContactPhone` / `RetireContactPhone` are replaced by `ChangeContactEndpoint` / `RetireContactEndpoint`, each with a `channel` of `phone` or `whatsapp`.
  - Both channels need the same customer `edit` authority, reason (note for `other`), verification method and `expectedVersion`.
  - Changing the phone moves a WhatsApp value equal to the old phone with it (`whatsappFollows`).
- **Alternate paths closed:**
  - `UpdateContact` on an existing contact refuses any `phone` or `whatsapp` key with `VALIDATION_FAILED`. Before, a WhatsApp string could restore a retired number.
  - New contacts and registration normalize through the same contract.
- **No auto-verification:** a newly entered number gets status `unverified` or `identity_review`. `verified` is reserved and nothing sets it in this slice. The verification method records how the change request was confirmed. It does not prove ownership of the number.
- **Retirement:**
  - Clears the channel's number, display and status, and records `*_retired_at` / `*_retired_reason` per channel. WhatsApp columns are new.
  - Ends the channel's active association.
  - The quote PDF contact uses only the active contact's current numbers, never a number under identity review. Before, the PDF fell back to WhatsApp unconditionally.
  - `selectPrimaryPhone` (customer list) skips numbers under review.
  - Documents already issued are not changed.
- **Dated association history (migration `20261018220000_os_contact_endpoints_t03`):**
  - `os_contact_endpoint_associations` holds one row per number per contact per channel, with start, end, end reason, verification method and recording member. Rows are ended, never overwritten, so a number can have many past owners.
  - Existing contact numbers are backfilled as open associations (60 on the disposable database).
- **Recycled numbers:**
  - A number that has an ended association on another customer may still be used. The new association opens an `os_contact_identity_reviews` row (`open`), and the channel status becomes `identity_review`.
  - The command response and event say only `identityReviewRequired`. They never name the earlier customer, contact or association.
  - Conversations are not linked automatically.
  - Re-adding a number to the same customer opens no review.
- **Events:**
  - `contact.endpoint.changed` / `contact.endpoint.retired` carry masked numbers only, plus channel, reason, note, method, evidence note, version and `whatsappFollows`.
  - Audit before/after are masked. Full numbers live only in the restricted association table.
  - `contact.updated` now carries `phoneMasked` / `whatsappMasked` instead of full numbers.
  - The old `contact.phone.*` event types stay registered so history still renders.
  - Timeline allowlist and C2 summary keys are added for both new types.
- **os-web:**
  - The builders now produce endpoint commands and number objects.
  - `updateContactAction` sends numbers only when creating a contact.
  - The change and retire actions keep their export names (the unintegrated lane B2 form imports them). They read `channel` (default `phone`, the existing form) and `country` (default `BO`, the only offered country).
  - Timeline lines read "Teléfono y WhatsApp: •••123 → •••456 · Motivo: … · Verificación: …".

## Sending (finding 5)

No outbound message path exists in this slice. Nothing here sends, cancels or reroutes a message. Outbound cancellation on retirement, provider behavior, and verification by message are **pending T12**. The earlier phone receipt's mention of "sending" is corrected.

## Checks (`evidence/T03-REVIEW-C5-ENDPOINTS/`)

| Check | Result |
|---|---|
| Builds: os-contracts, os-party, os-database, os-query | exit 0 each |
| Typecheck: os-api, os-party, os-web | exit 0 each |
| os-contracts / os-party / os-query (serial) | 192/192, 38/38, 115/115 |
| os-api full suite (serial, disposable PG) | 314/314 |
| os-web lib + components | 1318/1318 |
| `t03-contact-phone.http` (rewritten) | 8/8 |
| Flags (C2/C3) and customer authority HTTP | 5/5, 10/10 |
| R4, D1, B1, R1, B4 HTTP and quote-PDF unit, with registration payloads moved to number objects | 4/4, 2/2, 3/3, 8/8, 3/3, 4/4 |

Mutations were run inline and each was caught by one failing test:
- removing the existing-contact number lock;
- never opening an identity review;
- letting the PDF use a number under review.

The sources were restored with identical sha256.

The rewritten HTTP test cannot run against `c3587538` because the commands it calls did not exist there. The pre-fix behavior is the review's probes P1, P2 and P4.

## States and limits

- IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN.
- The customer page still has no WhatsApp change or retire control. The existing-contact WhatsApp input in `customer-edit-forms.tsx` is still editable, and its value is ignored for existing contacts. Making it read-only and adding the channel and country controls is lane B2 UI. This is not a completed user workflow.
- **Engineering defaults for review:**
  - `BO` is the only country;
  - an ended association on another customer, at any age, opens a review;
  - entered text is cleared on retirement but kept in the history.
- **Pending:**
  - C6: restricted masked history endpoint and justified reveal.
  - C7: resolution of identity reviews.
  - `os-import` writes contacts directly and does not use this contract (tracked, separate lane).
