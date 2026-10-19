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

**Read: `GET /v1/issues/:issueId/correction/candidate-events`** (follow-up commit `639c4dc1`).

- Lists, newest first and at most 20, the customer change events an "applied" decision may cite. It uses the same matcher as `ResolveIssue`.
- Only for someone who may apply the change: 404 without issue read or customer knowledge, 403 when the customer is known but the change is not theirs.
- Returns `{eventId, eventType, occurredAt, actorMemberId}` only, with no event payloads.

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
- **Mutations M23–M25:** all caught. **M26** (candidate list without the matcher) survived the first test, which had no decoy event; after adding another customer's contact change, it is caught.
- **Milestone on the committed tree:** every listed suite passed in full in one serial run.

## Limitations

- **Authority can change after assignment.** It is checked at assignment and again at resolution. An owner who loses range in between can no longer decide; reassignment is manual.
- **Event and record are not written atomically.** The issue event goes through the workforce store outside the issue transaction (existing issue pattern, not changed here).
- **Shared fields.** `display_name` and `legal_name` both cite `party.updated`. The matcher checks the event kind and target, not which attribute changed.
- **Candidate list window.** The read scans the 200 newest events of the matching kinds since the request, then filters. In a very busy organization an older matching change can fall outside that window; citing its id directly still works.
- **UI** is assigned to Lane B (item 9) and not started.

## Completion delta (instruction 2026-10-19 01:49) — commit `cdde6603`

State: IMPLEMENTED and LOCALLY TESTED. Not independently reviewed, not integrated, not deployed, not browser-verified. The limitations above about authority between assignment and resolution, the non-atomic event, shared party fields and the 200-event window are **fixed** by this delta; the remaining limitations are listed below.

**Exact resolution evidence.**

- Customer events now say which attributes changed, without values in public payloads:
  - `party.updated` already carried `changedFields`;
  - `contact.updated` adds `changedFields`, `created` and `version`;
  - `location.updated` adds `changedFields` and `version`;
  - endpoint events already carried `channel` and `whatsappFollows` (masked numbers only).
- `correctionFieldsChangedBy` maps them to correction fields:
  - `displayName` → `display_name`; `legalName` → `legal_name` (never interchangeable);
  - given or family name → `contact_name`; email → `contact_email`;
  - phone channel → `contact_phone`; WhatsApp channel or `whatsappFollows` → `contact_whatsapp`;
  - `addressText` → `location_address`;
  - fiscal events → `fiscal_identity`.

  A contact creation is not a correction.
- Applied requires, at resolution time:
  - the cited event changed the requested field on the same customer target, at or after the request;
  - its version is newer than the target version captured when the request was made (`target_version_at_request`; null for fiscal and `other`);
  - its author could apply that change at the time (roles, delegations and customer range as of the event).

  Otherwise `CORRECTION_EVIDENCE_INVALID` (409).
- The value it set is compared with the proposal:
  - text: normalized case and whitespace;
  - fiscal: digits;
  - phone or WhatsApp: the current number, used only when the cited event is the latest such change.

  If the values differ or are unknown, `differenceExplanation` (10–500) is required, otherwise `CORRECTION_VALUE_DIFFERS` (409). `value_matched` and the explanation are stored in the restricted record. A database check (migration 39, `NOT VALID` so earlier local rows are untouched) enforces it for new and updated rows. The `issue.resolved` event carries `valueMatched` and the explanation, never the proposed value.

**Transactional consistency.** Every issue command, not only corrections, now writes its business event, outbox message, audit row and idempotency record in the issue transaction (the API adapter delegates them to the transaction-bound issue store instead of the workforce store). No issue command logic changed.

**Change selection.**

- `GET …/correction/candidate-events?limit=1..50&cursor=` pages on the server, newest first. The keyset is `(occurredAt, id)` and the cursor is opaque; a bad cursor or limit returns 400. The database prefilters by event type, target and changed attribute. Items add `fields`.
- `GET …/correction/candidate-events/:eventId` returns one change if it is citable for this request, otherwise 404.
- Both reauthorize on every call: 404 without issue read or customer knowledge, 403 without apply authority. Neither returns event payloads.

**Responsibility and revoked access.**

- Current standing is enforced on `StartIssueProgress`, `AddIssueJournalEntry`, `LinkIssueWork`, `RecordIssueOutcome`, `ResolveIssue` and idempotent replays.
- A correction's owner must still be able to apply the change (403). A non-manager reporter must still know the customer (404). `issue.manage` keeps process management, including reassignment.
- The value read and candidate reads already rechecked current authority. A former owner who keeps customer knowledge gets `proposedValue: null`; one who loses it gets 404.
- `GET /v1/issues?view=correction_attention` (`issue.manage` only, otherwise 403) lists open correction requests with `correctionAttention: 'unassigned' | 'owner_lacks_authority'`.

**Proof (disposable Postgres, synthetic data)** in the new `t03-correction-integrity.http.test.ts` (6 tests):

- an injected failure on the last write of `ReportIssue` leaves the issue, correction, reference, event, outbox, audit and idempotency counts unchanged; a retry with the same key creates each exactly once; a further retry replays the same issue with no new rows;
- the same for `ResolveIssue`: no false status, outcome or decision, and exactly one `issue.resolved` event after the retry and replay;
- three changes read one per page; the third page holds the oldest change; citing it resolves Applied with `valueMatched = true`; exact lookup returns 200 for a citable change and 404 for a non-citable or unknown one;
- a different value is refused with 409 and accepted with an explanation;
- a legal-name change cannot evidence a display-name request (409; exact lookup 404); the display-name change can;
- a coverage-based owner narrowed to work-only coverage loses the value (`null`), candidates (403), journal (403) and resolution (403); revoked coverage gives 404; the queue shows `owner_lacks_authority` until reassignment; an unassigned request shows `unassigned`.

The existing HTTP suite was adjusted: a wrong event now returns 409, and candidate items include `fields`. Mutations M27–M35 were all caught. The milestone ran green on the committed tree in one serial run (`evidence/T03-L4-CORRECTION-REQUESTS/results.txt`).

**Remaining limitations.**

- `location_city` has no applying command (`UpdateLocation` has no city), so it can only be Rejected.
- `other` can never be value-matched, so Applied always needs an explanation.
- Phone and WhatsApp values are known only for the latest change on that contact.
- There is no automatic reassignment. Stale owners are refused and surfaced in the queue.
- The applied-value check constraint is `NOT VALID` for rows created before migration 39.
