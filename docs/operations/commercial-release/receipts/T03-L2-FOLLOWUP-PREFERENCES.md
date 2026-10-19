# Receipt — T03 L2: contact follow-up preferences

Instruction 2026-10-18 22:56 §5. Commit `9e7dc7d5`. Contract `contracts/T03-LIFECYCLE-CONTRACTS.md` L2.

State: IMPLEMENTED and LOCALLY TESTED. Not independently reviewed, not integrated, not deployed, not browser-verified. No UI is wired, and no sender exists to apply it.

## Behaviour

**`SetContactFollowupPreference`.**

- Payload `{partyId, contactId, channel, preference, source, identityConfirmed, expectedVersion, note?}`.
  - Channels: `whatsapp`, `phone`, `email`.
  - Values: `allowed`, `no_promotions`, `no_unsolicited_followups`.
  - Sources: `customer_message`, `staff_recorded`.
  - These are the stored values of the existing `os_contact_followup_preferences` table; no migration was needed.
- Authority is customer `edit`. The actor is always a member; the AI controller has no path to party commands.
- Rules (shared by the payload schema and the service):
  - a customer message requires a person to confirm the sender (`identityConfirmed`);
  - restricting is always accepted;
  - `allowed` requires `staff_recorded`, confirmed identity and a note of at least 10 characters, so a generic "sí" is refused.
- Refusals:
  - an ended relationship or a version mismatch returns `CONFLICT`, including a concurrent first insert;
  - a hidden customer returns `NOT_FOUND`;
  - a coverage-only advisor gets `PERMISSION_DENIED`.
- Effects: one row per channel, `version + 1`, recorder and time; event `contact.followup_preference.changed` `{from, to, source, identityConfirmed, note, version}` with outbox and audit.
- Unchanged: earlier events remain as history; nothing is deleted; orders, payments and other records are untouched.

**Read.** `GET /v1/parties/:partyId/contacts/:contactId/followup-preferences`.

- Open to anyone who may read the customer, so whoever contacts them can respect the preference.
- Returns one entry per channel: value, source, identity flag, version and time. The note is not included.
- The timeline gives the note only to customer editors.
- The flag `canSetFollowupPreference` is added (web type mirror only).

**`followupPermitted(preference, kind)`.**

- `promotional` is always refused (mass marketing is disabled).
- `no_unsolicited_followups` also refuses `optional_followup`.
- `requested_reply` and `transactional` are never refused.

T09 and T12 must combine it with the L1 recipient eligibility when planning and again before sending.

## Checks

Recorded in `evidence/T03-L2-FOLLOWUP-PREFERENCES/`:

- **New HTTP and Postgres suite (6 tests):**
  - reads for an editor and a coverage reader; hidden customer;
  - refusals that store nothing;
  - restriction recorded with actor, source and version; same-key replay;
  - relaxing with a version check, with history kept;
  - former contact refused;
  - timeline note restricted.
- **New contract unit tests (5).**
- **Updated suites:** C3 flags, read inventory.
- **Mutations M18 and M19:** both caught.
- **Milestone on the committed tree:** all listed suites passed in full in one serial run.

## Limitations and assigned work

- No job or sender consumes the preference yet (T09/T12). This slice records and exposes it only.
- Preferences on email are recorded, but the email address itself has no endpoint history (outside L2).
- UI is assigned to Lane B (item 7) and not started. Lane B stays gated on its review.
