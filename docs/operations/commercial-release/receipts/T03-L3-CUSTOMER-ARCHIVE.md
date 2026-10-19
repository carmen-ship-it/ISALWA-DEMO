# Receipt — T03 L3: customer archive and reactivation

Instruction 2026-10-18 22:56 §5. Commit `2fefe96d`. Contract `contracts/T03-LIFECYCLE-CONTRACTS.md` L3.

State: IMPLEMENTED and LOCALLY TESTED. Not independently reviewed, not integrated, not deployed, not browser-verified. The web app still lists both commands as not wired.

## Behaviour

**`DeactivateParty` (archive).**

- Payload `{partyId, expectedVersion, reason, reasonNote?}`.
  - Reasons: `no_longer_operating`, `no_current_commercial_relationship`, `duplicate_under_review`, `other`.
  - `other` requires a note of 10–500 characters.
- Authority is unchanged: `commercial.customer.archive` plus range, or data steward. Coverage never confers it.
- Refused (`CONFLICT`) when the customer is already archived or the version is stale.
- Obligations are counted in the same transaction as the write:
  - open orders;
  - open commitments;
  - open issues referencing the customer;
  - open work items whose subject is the customer.

  Any open obligation refuses the archive with `ARCHIVE_BLOCKED_BY_OBLIGATIONS` (409). There is no transfer path in this slice (A2 §6 allows blocking).
- Effects: `status = inactive`, `version + 1`, event `party.deactivated` `{reason, reasonNote, obligationsChecked: true, paymentsChecked: false}`.
- Unchanged: owner and ownership history, coverage grants, quotes, opportunities, contacts and preferences.

**`ReactivateParty`.**

- Payload `{partyId, expectedVersion, reasonNote (10–500)}`. Only an archived customer qualifies (`CONFLICT` otherwise).
- Effects: `status = active`, `version + 1`, event `party.reactivated`.
- Nothing else comes back:
  - expired coverage stays expired;
  - preferences, quotes and opportunities are unchanged, and lost opportunities stay lost;
  - no new customer record is created.

**Archive preview.** `GET /v1/parties/:partyId/archive-preview` requires archive or reactivate authority. It returns counts of obligations and effects, `blocked`, and `payments: {checked: false, reason: 'payments_not_available'}`. Payments are never shown as zero.

**Flags and timeline.**

- New flags: `canArchiveCustomer` (active customers) and `canReactivateCustomer` (archived customers). The web type mirror is updated.
- The timeline shows the archive reason to readers; reason notes go only to customer editors.

**Import reversal.**

- Before writing anything, the reversal checks every customer the batch created. If any has an open obligation, the whole reversal is refused with `ARCHIVE_BLOCKED_BY_OBLIGATIONS`.
- Customers already archived are skipped.
- Archives made by a reversal record reason `other` with a note naming the batch.

## Checks

Recorded in `evidence/T03-L3-CUSTOMER-ARCHIVE/`:

- **New HTTP and Postgres suite (6 tests):**
  - preview contents and gates (expired coverage, coverage with archive scope, hidden customer);
  - refusals that change nothing;
  - each of the four obligation kinds blocking alone until closed;
  - archive effects and same-key replay;
  - reactivation refusals, and what is not restored;
  - timeline restriction.
- **New import integration case:** a refused reversal leaves every party, contact and location unchanged; after the obligation closes, the reversal archives both customers.
- **New contract unit tests (3).**
- **Updated:** existing archive tests now use the new payload; the C3 steward flag expectation now includes archive.
- **Mutations M20–M22:** all caught.
- **Milestone on the committed tree:** all listed suites passed in full in one serial run.

## Limitations

- **Orders never complete.** Orders have only `open` and `cancelled` states, so any non-cancelled order blocks archiving until an order lifecycle exists.
- **Payments are not checked** (no payment or advance model; T07). The preview and event say so explicitly.
- **Concurrency.** Commercial writes check that the customer is active when they read it, but they do not lock the customer row. A new order or commitment committed concurrently with an archive can therefore still land on an archived customer.
- **Import reversal is not one transaction.** The preflight and the per-row writes are separate, so an obligation created in between stops the reversal at that customer. A retry then refuses before writing.
- **Search.** The "include archived" search filter is not part of this slice.
- **UI** is assigned to Lane B (item 8) and not started.
