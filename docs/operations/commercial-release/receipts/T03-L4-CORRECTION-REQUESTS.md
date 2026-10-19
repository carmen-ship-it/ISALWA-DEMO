# Receipt — T03 L4: customer data correction requests

Instruction 2026-10-18 22:56 §5. Commit `22608eb6`. Contract `contracts/T03-LIFECYCLE-CONTRACTS.md` L4.

State: IMPLEMENTED and LOCALLY TESTED. Not independently reviewed, not integrated, not deployed, not browser-verified. No web screen exists for it.

## Behaviour

**Reuses the issue machinery.** A correction request is an ordinary issue (`ReportIssue`, `AssignIssueOwner`, `ResolveIssue`, `ReopenIssue`) with one restricted record in the new table `os_issue_correction_requests` (migration 38, applied by hand to the disposable database only). No second ticket system and no new scope.

**`ReportIssue` with `correction`.**

- Payload `correction: {partyId, contactId?, locationId?, field, proposedValue (1–500), source}`.
  - Fields: `display_name`, `legal_name`, `fiscal_identity`, `contact_name`, `contact_email`, `contact_phone`, `contact_whatsapp`, `location_address`, `location_city`, `other`.
  - Contact fields require `contactId`; location fields require `locationId`.
  - Sources: `customer`, `staff`, `document`.
- The reporter must be able to know the customer. A hidden, missing or foreign customer returns `NOT_FOUND`, and so does a contact or location belonging to another customer. Nothing is stored.
- The party reference is linked automatically.
- The proposed value is stored only in the restricted record. The `issue.reported` event carries the field, source and target, never the value.

**Responsible person (`AssignIssueOwner`).** The new owner must be able to apply the change, otherwise `VALIDATION_FAILED`:

- `legal_name` needs `master_data.admin` (data-steward maintenance, as in C3).
- `fiscal_identity` needs `fiscal.admin` (the scope `UpdateFiscalIdentity` already requires).
- Every other field needs `master_data.admin` or customer edit authority (`canActOnCustomer('edit')`).

The owner must also know the customer. This alignment of `fiscal_identity` with the existing fiscal command is recorded in the contract; it introduces no new policy.

**Resolution (`ResolveIssue`).**

- A correction requires `correction: {decision, appliedEventId?, reason (10–500)}`. An ordinary issue refuses it.
- The resolver must be the owner or hold `issue.manage`, **and** must be able to apply the change (`PERMISSION_DENIED` otherwise). `issue.manage` alone cannot decide.
- `applied` must cite a business event that:
  - is of the kind matching the field (for example `contact.updated` for `contact_name`, `party.fiscal_identity.changed` for `fiscal_identity`);
  - concerns the same customer, and the same contact or location when the request names one;
  - was recorded at or after the request.

  Otherwise `VALIDATION_FAILED`, and nothing changes.
- `rejected` carries a reason and no event.
- The issue outcome becomes the decision (`applied` / `rejected`). `RecordIssueOutcome` is refused on a correction request.
- `ReopenIssue` clears the decision and the outcome; the earlier decision remains in the event history.

**Read: `GET /v1/issues/:issueId/correction`.**

- Requires issue read access (reporter, owner, `issue.manage`) **and** knowledge of the customer; otherwise 404.
- The proposed value is shown to the reporter, to whoever may apply the change, and to `issue.manage`. Others get `null`.
- States: `pending`, `in_review` (issue `in_progress`), `applied`, `rejected`. Decision details appear only once the issue is resolved or closed.
- `canDecide` is a display hint; the command rechecks.

**Never a bypass.** The request writes no customer data. Payments, quotes, orders and issued documents are not correction fields, and the schema refuses them. Without the customer-authority port, correction commands are refused (fail closed).

**Pre-existing defect fixed.** Over HTTP, `ReportIssue` with any reference failed with 500: the API adapter wrote an empty `createdByMemberId`, which the `os_issue_references_created_by_chk` constraint rejects. References now record the reporting member.

## Checks

Recorded in `evidence/T03-L4-CORRECTION-REQUESTS/`:

- **New HTTP and Postgres suite (6 tests):**
  - a reporter who cannot know the customer is refused and nothing is stored;
  - the restricted record and party link are stored, and the event has no value;
  - the read gate (`issue.manage` without customer knowledge gets 404);
  - owner assignment refused for a member without range;
  - "applied" citing a `party.updated` event is refused, while citing the contact's own `contact.updated` is accepted;
  - `RecordIssueOutcome` is refused.
- **New os-issue unit suite (9)** and **new contract unit suite (3).**
- **Read inventory** classifies the new GET.
- **Mutations M23–M25:** all caught.
- **Milestone on the committed tree:** every listed suite passed in full in one serial run.

## Limitations

- **Authority can change after assignment.** It is checked at assignment and again at resolution. An owner who loses range in between can no longer decide; reassignment is manual.
- **Event and record are not written atomically.** The issue event goes through the workforce store outside the issue transaction (existing issue pattern, not changed here).
- **Shared fields.** `display_name` and `legal_name` both cite `party.updated`. The matcher checks the event kind and target, not which attribute changed.
- **UI** is assigned to Lane B (item 9) and not started.
