# Receipt — T03 L1: ending a contact's company relationship

Instruction 2026-10-18 22:56 §4. Commit `15e0e089`. Contract `contracts/T03-LIFECYCLE-CONTRACTS.md` L1.

State: IMPLEMENTED and LOCALLY TESTED. Not independently reviewed, not integrated, not deployed, not browser-verified. No UI is wired, so this is not a completed user workflow.

## Behaviour

**`EndContactRelationship`.**

- Payload `{partyId, contactId, expectedVersion, reason, reasonNote?, endedOn?}`.
  - Reasons: `left_company`, `role_changed`, `duplicate_contact`, `other`. `other` requires a note of 10–500 characters.
  - `endedOn` is a day in America/La_Paz. It defaults to today, may not be in the future, and may predate the contact's registration.
- Authority is customer `edit` (same rule as contact edits). A hidden customer returns `NOT_FOUND`; a coverage-only advisor gets `PERMISSION_DENIED`.
- A stale version, or a relationship that has already ended, returns `CONFLICT`.
- Effects, in one transaction:
  - contact `status = inactive`, with `relationEndedAt` and `relationEndReason`, `version + 1`;
  - its open phone and WhatsApp associations end with `relation_ended:<reason>`;
  - open identity reviews are superseded;
  - event `contact.relation.ended` (no numbers) with outbox and audit.
- Unchanged: the stored numbers (dated history), the person, other contacts, commitments, orders, quotes and documents.
- After the end:
  - the former contact cannot be edited (`CONFLICT`), re-numbered or ended again;
  - a renewed relationship needs a new contact;
  - the number appearing on another customer opens an identity review.

**Relationship-end preview.** `GET /v1/parties/:partyId/contacts/:contactId/relationship-end-preview` uses the same edit gate. It returns:

- whether the contact is the current default document contact, and its replacement;
- masked channels;
- the follow-up preference count and the open identity review count;
- the customer's open commitments (id, due date, owner, state; no text), marked `commitmentLinkage: 'customer'`, because no commitment links to a contact;
- `automaticSends: {configured: false, label: 'Envíos automáticos no configurados.'}`.

No pending sends are shown or cancelled.

**Recipient eligibility (T12 hook).** `contactRecipientEligibility`, `assertRecipientStillEligible` and `pickCurrentContact` live in `os-contracts`.

- They refuse:
  - ended relationships;
  - inactive contacts;
  - retired or missing numbers;
  - numbers under identity review;
  - any change since a send was planned (`recipient_changed`, through `recipientVersion = contact:version:channel:number`).
- The quote PDF no longer falls back to the first contact when none is current.
- Existing `status === 'active'` selection sites exclude ended contacts because the status changes in the same write.
- A future sender (T12) must store `recipientVersion` when it plans a send and recheck it before sending. Provider verification is PENDING (T12).

**Read surfaces.**

- Customer authority flags gain `canEndContactRelationship` (the web type mirror is updated; no UI).
- The timeline gives the reason note only to customer editors.
- The new GET is in the read-route inventory.

## Checks

Recorded in `evidence/T03-L1-CONTACT-RELATIONSHIP-END/`:

- **New HTTP and Postgres suite (7 tests):**
  - preview contents and gates;
  - refusals that change nothing;
  - the end itself: date, reason, version, numbers kept, associations ended, event without numbers, audit, other contact and commitment untouched, same-key replay;
  - refusals on the former contact;
  - an identity review when the number reappears elsewhere;
  - the default day;
  - timeline restriction of the note.
- **New contract unit tests (6).**
- **Updated suites:** PDF picker, C3 flags, read inventory.
- **Mutations M15–M17:** all caught.
- **Milestone on the committed tree:** all listed suites passed in full in one serial run.

## Limitations and assigned work

- Commitments, orders and quotes link to the customer only, so the preview cannot say which ones involved this contact.
- The relationship cannot be resumed; a new contact is required (A2 §5).
- UI for ending a relationship and showing the preview is assigned to Lane B (item 6) and not started. Lane B stays gated on its review.
