# T03 customer UI — backend contracts for the UI lane

Owner: integrator (`ct3/v1-repairs`). The UI lane implements **only** contracts marked STABLE with a commit SHA. A PLANNED contract may be read in order to prepare markup, but it must not be called, mocked as an endpoint, or replaced by a local rule. When the UI needs something that isn't here, the UI lane reports a dependency and does not add a field.

Source decisions: owner reconciliation of the independent review of `3129709` (2026-10-18 21:22; `receipts/REVIEW-T03-3129709.md`).

| Id | Contract | Status |
|---|---|---|
| C1 | `UpdateParty` reason, no-op, legal-name handling | STABLE (API; see the C1 commit in `COMMERCIAL_RELEASE_CHECKPOINT.md`). `canEditLegalName` / `canReadLegalName` come with C3 |
| C2 | Timeline field-level visibility | STABLE (API and web labels; see the C2 commit in `COMMERCIAL_RELEASE_CHECKPOINT.md`, receipt `receipts/T03-REVIEW-C2-TIMELINE.md`) |
| C3 | Customer detail authority flags | STABLE (API and web actions; see the C3 commit in `COMMERCIAL_RELEASE_CHECKPOINT.md`, receipt `receipts/T03-REVIEW-C3-AUTHORITY-FLAGS.md`). All flags live since C7 |
| C4 | Coverage grants (all, bounded, revocable) | STABLE (API and web action; see the C4 commit in `COMMERCIAL_RELEASE_CHECKPOINT.md`, receipt `receipts/T03-REVIEW-C4-COVERAGE.md`) |
| C5 | Contact endpoints (phone and WhatsApp): canonical number input, change, retire | STABLE (API, web actions and types; see the C5 commit in `COMMERCIAL_RELEASE_CHECKPOINT.md`, receipt `receipts/T03-REVIEW-C5-ENDPOINTS.md`). Review opening is part of C5 |
| C6 | Endpoint history, masked by default; justified reveal | STABLE (API and web client/action; see the C6 commit in `COMMERCIAL_RELEASE_CHECKPOINT.md`, receipt `receipts/T03-REVIEW-C6-ENDPOINT-HISTORY.md`) |
| C7 | Identity review for previously used numbers | STABLE (API and web action; see the C7 commit in `COMMERCIAL_RELEASE_CHECKPOINT.md`, receipt `receipts/T03-REVIEW-C7-IDENTITY-REVIEW.md`) |
| C8 | Steward lookup | STABLE (API from T03 part 3; web loader `a1c6771`) |

Commands go through the existing `POST /v1/commands/:name` (`executePartyCommand` / `executeCommercialCommand`). Error codes are the existing ones (`VALIDATION_FAILED`, `PERMISSION_DENIED`, `NOT_FOUND`, `CONFLICT`); the UI maps them with `mapCommandError`. The integrator adds the os-web client methods and types (`lib/api/os-api-client.ts`, `lib/party/types.ts`) at the same commit that makes a contract STABLE.

## C1 — UpdateParty

Payload: `partyId`, `expectedVersion`, `displayName?`, `legalName?`, `changeReason?` (trimmed, 1–500).
- `changeKind` is **removed**. Any actual change to `displayName` or `legalName` requires `changeReason`, typos included.
- Omitting `legalName` leaves it unchanged and needs no legal-name authority. Sending `legalName` equal to the stored value is also not a change. Only a different value needs `canEditLegalName` (C3).
- Exact no-op: result `data = { partyId, unchanged: true, version }`. The version doesn't move and no business event is written.
- Change: result `data = { partyId, unchanged: false, version, changedFields: ('displayName'|'legalName')[] }`.
- UI rule: the form sends `legalName` only when `canEditLegalName` is true. It never renders a hidden or read-only legal-name value for a viewer without `canReadLegalName`. Help text: "Indique el motivo de cualquier cambio de nombre o razón social, incluso un error de escritura."

## C2 — Timeline visibility

Each item in `GET /v1/parties/:partyId/timeline` gains `detail: 'full' | 'summary'`.
- `summary`: `facts` holds only safe keys, e.g. `changedFields` and `version`. The UI shows the event label with no field values and no reason.
- `full`: facts as today. Names and reasons appear only for viewers who may edit that customer's fields.
- Phone and WhatsApp numbers stay masked in every timeline response.

## C3 — Customer detail authority flags

`GET /v1/parties/:partyId` gains `customerAuthority`, which is computed by the API from current authority. The UI never derives these from scopes.

```ts
customerAuthority: {
  canEditDisplayName: boolean;
  canReadLegalName: boolean;      // false → party.legalName is null in the response
  canEditLegalName: boolean;
  canEditContacts: boolean;       // names, email, title; add contact
  canChangeEndpoints: boolean;    // C5 change/retire phone and WhatsApp
  canReviewEndpointHistory: boolean; // C6 masked history
  canRevealEndpoint: boolean;     // C6 justified reveal
  canResolveIdentityReview: boolean; // C7
}
```

The web actions stop gating on `master_data.admin` (`adminClient`). The API decides, and the UI hides controls whose flag is false.

As implemented:
- Flags use the customer `edit` command rule (`master_data.admin` or `canActOnCustomer('edit')`); `canEditLegalName` also needs `master_data.admin`.
- Legal-name read (engineering default, pending owner confirmation): customer editors and data stewards who can open the record. Search returns `legalName` only to data stewards.
- `canReviewEndpointHistory`, `canRevealEndpoint`, `canResolveIdentityReview` are false until C6/C7 ship.
- The customer page must read these flags instead of `actorCanMutateMasterData` (lane B2). `updateCustomerAction` omits `legalName` when the form has no such field, so the form must render the legal-name input only when `canEditLegalName`.

## C4 — Coverage grants

- `GrantCustomerCoverage` payload: `commercialAccountId`, `actingAdvisorMemberId`, `coveredActions` (non-empty, from `commercialAuthority.grantableCoverageActions`), `startsAt?` (default now; at most 30 days ahead), `endsAt` (**required**, after `startsAt`, at most 30 calendar days after it), `note?`.
- No open-ended or automatically renewed grant. To extend, record a new grant that starts when the current one ends (overlap for the same helper → `VALIDATION_FAILED`).
- 30 days is an engineering default, not a customer rule.
- `grantableCoverageActions` and the command use the grantor's independent authority only (role assignments, never received delegations).
- Detail: `coverageGrants: Array<{ grantId, actingAdvisorMemberId, primaryOwnerMemberId, coveredActions, startsAt, endsAt, status: 'active' | 'scheduled', recordedByMemberId, canRevoke }>`, with every active and scheduled grant, ordered by start. No name field: the page labels members with its existing member-label resolution. `commercialAuthority.canRevokeCoverage` is added. `activeCoverage` is deprecated and removed when the UI switches.
- Web action: `grantCustomerCoverageAction` takes form fields `startsOn?` and `endsOn` (`YYYY-MM-DD`, America/La_Paz). Coverage ends at the local midnight after `endsOn`; a start of today means now. The panel adds the two day inputs (lane B2). The range limit is shown as text; the action already refuses out-of-range days.
- Revoke: existing `RevokeCustomerCoverage` with `grantId`; show it only when `canRevoke`.

## C5 — Contact endpoints

Number input everywhere (new contact, `CreateParty` registration phone, change): `{ country: 'BO', number: string }`.
- `country` is required, from `CONTACT_PHONE_COUNTRIES` (initially `['BO']`).
- The API normalizes to E.164 and stores the entered text separately. Country is never inferred from digit count.
- `UpdateContact` on an existing contact **must not** carry `phone` or `whatsapp` → `VALIDATION_FAILED`. A new contact may carry them in the object form above.
- `ChangeContactEndpoint` replaces `ChangeContactPhone`. Payload: `partyId`, `contactId`, `expectedVersion`, `channel: 'phone' | 'whatsapp'`, `newNumber: { country, number }`, `reason`, `reasonNote?` (required for `other`), `verificationMethod`, `evidenceNote?`.
- `RetireContactEndpoint` replaces `RetireContactPhone`. Payload: `partyId`, `contactId`, `expectedVersion`, `channel`, `reason`, `reasonNote?`.
- A newly entered number is `unverified`. A change records the chosen verification method, but the contact doesn't become automatically verified.
- Contact read model additions:
  - `phoneDisplay`, `whatsappDisplay` (entered text) next to `phone` and `whatsapp` (E.164);
  - `phoneStatus` and `whatsappStatus`: `'unverified' | 'verified' | 'identity_review'`.
  - A retired endpoint is `null` and is not a current destination anywhere (quote PDF included). Documents already issued are unchanged.

As implemented:
- `normalizeContactNumber`, `maskContactNumber`, `ContactNumberInputSchema`, `CONTACT_ENDPOINT_CHANNELS` and `CONTACT_ENDPOINT_STATUSES` are exported from `@isalwa/os-contracts`. The UI may use `normalizeContactNumber` for early feedback only; the API decides.
- Changing `channel: 'phone'` also moves a WhatsApp value equal to the old phone (`whatsappFollows`). Retiring the phone does the same.
- An endpoint under `identity_review` is excluded from the quote PDF and from the customer list's primary phone.
- Events: `contact.endpoint.changed` / `contact.endpoint.retired` (masked numbers, `channel`, `whatsappFollows`; `identityReviewRequired` on change). Timeline summary keys: `partyId`, `contactId`, `channel`, `reason`, `version`.
- os-web: `changeContactPhoneAction` / `retireContactPhoneAction` keep their names and read form fields `channel` (default `phone`), `country` (default `BO`), `newPhone`, `reason`, `reasonNote`, `verificationMethod`, `evidenceNote`, `expectedVersion`. `updateContactAction` reads `phone` / `whatsapp` / `country` only when there is no `contactId`.
- UI (lane B2): the existing-contact WhatsApp input must become read-only like the phone input. Add a channel choice to the change and retire forms, show `phoneDisplay` / `whatsappDisplay`, and show the C7 notice when a status is `identity_review`. Gate everything on `canChangeEndpoints`.

## C6 — Endpoint history

- `GET /v1/parties/:partyId/contacts/:contactId/endpoints`: items `{ associationId, channel, numberMasked, startedAt, endedAt, endReason, verificationMethod }`. Needs `canReviewEndpointHistory`. No full numbers.
- `RevealContactEndpoint` command: `{ partyId, contactId, associationId, justification }` (justification 10–500). Needs `canRevealEndpoint`. Result `data.number` is shown once, not cached by the UI, with an audit record that holds no number.

As implemented:
- Items are newest first and limited to this contact on this customer. 403 when the customer is readable but the flag is false; 404 for an unreadable customer or a contact of another customer.
- Both flags follow the customer edit rule (engineering default).
- A reveal is never stored for idempotent replay. Send a fresh idempotency key per reveal; a reused key answers `CONFLICT`.
- os-web: `client.listContactEndpointHistory(partyId, contactId)` → `ContactEndpointHistoryResponse`. `revealContactEndpointAction` takes form fields `partyId`, `contactId`, `associationId`, `justification` and returns `{ ok: true, number }`. The UI shows the number in place and does not store it. Reason text help: "Explique por qué necesita ver el número completo."

## C7 — Identity review

- When a number entered for a contact matches an ended association on another customer, the contact endpoint becomes `identity_review` and a review is opened.
- The new customer's viewers see only "Este número estuvo asociado antes a otro registro. Verifique la identidad antes de usarlo." They never see the former customer, contact or history. No conversation is linked automatically.
- `ResolveContactIdentityReview`: `{ partyId, contactId, channel, decision: 'confirmed' | 'rejected', verificationMethod, note }`. Needs `canResolveIdentityReview`. `confirmed` → `unverified` endpoint in use; `rejected` → endpoint retired.

As implemented:
- The payload also needs `expectedVersion` (contact version); `note` is optional (1–500).
- Refused with `VALIDATION_FAILED` when the channel is not under review.
- Changing or retiring the number first closes the review as `superseded`.
- Event `contact.identity_review.resolved` (channel, decision, method, note, version) is on the customer timeline.
- os-web: `resolveContactIdentityReviewAction` with form fields `partyId`, `contactId`, `expectedVersion`, `channel`, `decision`, `verificationMethod`, `note`. Notice text is `IDENTITY_REVIEW_NOTICE` in `lib/party/contact-phone.ts`. Show it, and the decision form, when `phoneStatus` or `whatsappStatus` is `identity_review` and `canResolveIdentityReview` is true. Show the notice alone otherwise.

## C8 — Steward lookup (STABLE)

`GET /v1/master-data/parties?q=|?nit=` and `/:partyId` (`master_data.admin`). Web: `loadMasterDataLookup`, `MasterDataLookupPanel` (`a1c6771`). Placement is the customer list page.

## Pending elsewhere

Outbound send cancellation to a retired endpoint and provider behavior are **T12, not implemented**. No sending exists in the OS. The UI must not claim that sends were cancelled or redirected.
