# T03 lifecycle contracts (L1–L4)

UNREVIEWED — NOT FOR TRANSFER. Local only. States per item: PLANNED until a commit SHA is listed; nothing here is independently reviewed, deployed or browser-verified.

Sources: `docs/product/COMMERCIAL_SELF_SERVICE_A2.md` §§4–6, `docs/product/COMMERCIAL_ASSISTANT_A1.md` §7, V2 opt-out/revalidation rule, `REUSE_MAP.md` §10.2, 21:22 decisions (phone/WhatsApp one boundary, dated number history, masked history), 22:56 instructions.

No business-policy conflict found while mapping. Model gaps are recorded per contract as limitations, not resolved by invention.

| Contract | Command / read | Reuses | State |
| --- | --- | --- | --- |
| L1 | `EndContactRelationship`, relationship-end preview, recipient eligibility | `OsContact` (`status`, `relationEndedAt`, `relationEndReason`), endpoint associations, identity reviews, customer `edit` authority | STABLE API `15e0e089`; locally tested; review and browser pending |
| L2 | `SetContactFollowupPreference`, preference read, `followupPermitted` | `OsContactFollowupPreference` (migration `20261016230000`), customer `edit` authority | STABLE API `9e7dc7d5`; locally tested; review and browser pending |
| L3 | `DeactivateParty` / `ReactivateParty` (extended), archive preview | `OsParty.status = 'inactive'` as Archivado, `canActOnCustomer` archive/reactivate | STABLE API `2fefe96d`; locally tested; review and browser pending |
| L4 | Correction request on `ReportIssue` / `ResolveIssue` | `os-issue` states, owner, journal, outcome; customer `edit` / `master_data.admin` / `fiscal.admin` | STABLE API `22608eb6`; locally tested; review and browser pending |

## L1 — Ending a contact's company relationship

**Existing model.**

- `OsContact.status` (free text; selection sites filter `status === 'active'`).
- `relationEndedAt` and `relationEndReason` exist in the schema and are unused.
- Endpoint associations end with a free-text `end_reason` (`changed:*`, `retired:*`, `identity_rejected`); `findEndedEndpointAssociationElsewhere` opens an identity review when an ended number reappears on another customer.
- No order, quote, commitment, work item or issue references a contact; all link to the customer (`partyId` / subject `party`).

**Command `EndContactRelationship`.**

```text
{ partyId, contactId, expectedVersion,
  reason: 'left_company' | 'role_changed' | 'duplicate_contact' | 'other',
  reasonNote?: string (10–500, required when reason = 'other'),
  endedOn?: YYYY-MM-DD (default: today in America/La_Paz; not in the future. It may predate the contact's registration) }
```

- Authority: customer `edit` (same rule as `UpdateContact`, via `CUSTOMER_COMMAND_ACTION`). Hidden customer → `NOT_FOUND`.
- Refused with `CONFLICT` on a version mismatch or if the relationship is already ended. There is no "un-end": a renewed relationship is a new contact that inherits nothing (A2 §5).
- One transaction:
  - contact `status = 'inactive'`, `relationEndedAt = endedOn 00:00 America/La_Paz`, `relationEndReason = reason`, `version + 1`;
  - every open endpoint association of the contact ends with `end_reason = 'relation_ended:<reason>'`, so a later appearance of that number on another customer opens an identity review;
  - open identity reviews on the contact are superseded;
  - event `contact.relation.ended` `{partyId, contactId, reason, reasonNote, endedOn}` plus outbox and audit. Numbers are not in the payload.
- Never:
  - deletes the contact, the person or the person's other relationships;
  - clears the stored numbers (they remain dated history);
  - changes orders, quotes, issued documents, commitments, payments or other contacts.
- After ending: `UpdateContact` and `EndContactRelationship` on that contact → `CONFLICT`. `ChangeContactEndpoint`, `RetireContactEndpoint` and `ResolveContactIdentityReview` keep their existing refusal of non-active contacts (`VALIDATION_FAILED`).

**Read `GET /v1/parties/:partyId/contacts/:contactId/relationship-end-preview`** (customer `edit` authority; otherwise 403, hidden customer 404). Response:

```text
{ contactId, version, relationStatus: 'current' | 'ended',
  documentRecipient: { isCurrentDefault: boolean, replacementContactId: string | null },
  channels: [{ channel: 'phone' | 'whatsapp', number: masked, status }],
  followupPreferences: number,            // recorded on this contact; they stop applying with the relationship
  openIdentityReviews: number,            // superseded on end
  customerOpenCommitments: [{ id, dueAt, ownerMemberId, state }],  // open commitments of the customer
  commitmentLinkage: 'customer',          // no commitment links to a contact in this model
  automaticSends: { configured: false, label: 'Envíos automáticos no configurados.' } }
```

The UI must present commitments as the customer's ("Compromisos abiertos del cliente"), never as commitments of this contact, and must not show cancellable pending sends.

**Recipient eligibility (T12 hook), `os-contracts`.**

```text
contactRecipientEligibility(contact, channel) →
  { eligible: true, numberE164, recipientVersion: '<contactId>:<contact.version>:<channel>:<numberE164>' }
| { eligible: false, reason: 'relation_ended' | 'contact_inactive' | 'no_current_number' | 'endpoint_retired' | 'identity_review' }
assertRecipientStillEligible(snapshotRecipientVersion, contact, channel) → same shape; a version mismatch → { eligible: false, reason: 'recipient_changed' }
```

- Every recipient selection uses it. `pickQuoteContact` stops falling back to the first contact when no contact is current; the PDF then shows no contact.
- T12 obligation (not implemented here): a future sender stores `recipientVersion` when a send is planned, and calls `assertRecipientStillEligible` immediately before sending. It rejects ended relationships, retired endpoints, numbers under identity review and any recipient change. Provider verification remains PENDING (T12).

## L2 — Contact follow-up preferences

**Existing model.** `OsContactFollowupPreference`:

- key: (org, contact, channel);
- `channel`: `whatsapp` | `phone` | `email`;
- `preference`: `allowed` | `no_promotions` | `no_unsolicited_followups`;
- `source`: `customer_message` | `staff_recorded`;
- also `identityConfirmed`, `version`, `recordedByMemberId`.

No code uses it yet.

**Command `SetContactFollowupPreference`.**

```text
{ partyId, contactId, channel, preference, source, identityConfirmed: boolean,
  expectedVersion: number (0 when no preference is recorded), note?: string (≤ 500) }
```

- Authority: customer `edit`. The actor is always a human member; there is no AI or automatic path. An assistant may suggest a restriction, but only this command records it.
- `source = 'customer_message'` requires `identityConfirmed = true`, meaning a person confirmed the message came from this contact (A1 §7).
- Restricting (`no_promotions`, `no_unsolicited_followups`) is always accepted.
- Relaxing to `allowed` requires `source = 'staff_recorded'`, `identityConfirmed = true` and a `note` of at least 10 characters. A generic "sí" is never consent. `allowed` is not marketing opt-in; mass marketing stays disabled.
- Refused on an ended relationship (`CONFLICT`), and on a version mismatch (`CONFLICT`).
- Upserts one row with `version + 1`. Event `contact.followup_preference.changed` `{partyId, contactId, channel, from, to, source, identityConfirmed}` plus outbox and audit. Nothing is deleted; orders, payments and history are untouched.

**Read.** `GET /v1/parties/:partyId/contacts/:contactId/followup-preferences` (customer read authority) returns one entry per channel: `{preference | null, source, identityConfirmed, version, updatedAt}`.

**Applicability, `os-contracts`.**

```text
followupPermitted(preference | null, kind: 'promotional' | 'optional_followup' | 'requested_reply' | 'transactional') → boolean
```

- `promotional` → `false` in this release regardless of preference (mass marketing disabled).
- `no_unsolicited_followups` → also blocks `optional_followup`.
- `no_promotions` → blocks only `promotional`.
- Never blocks `requested_reply` or `transactional`.

T09/T12 must combine this with L1 recipient eligibility at planning time and again before sending.

## L3 — Customer archive and reactivation

**Existing model.**

- `DeactivateParty` and `ReactivateParty` take `{partyId}` only (no reason, no version, no checks). Events are `party.deactivated` and `party.reactivated`.
- Authority already requires `commercial.customer.archive` / `.reactivate` plus range. Coverage grants never confer it.
- Commercial commands already refuse inactive customers.
- Obligation sources:
  - `OsOrder.status` (`open` | `cancelled`);
  - `OsCommitment.lifecycle = 'open'` by `partyId`;
  - `OsIssue` with a `party` reference, status not `resolved` or `closed`;
  - `OsWorkItem` with subject `party` and status `open`.
- There are no payment or advance models (T07).

**Payload changes.**

```text
DeactivateParty { partyId, expectedVersion,
  reason: 'no_longer_operating' | 'no_current_commercial_relationship' | 'duplicate_under_review' | 'other',
  reasonNote?: string (10–500, required when reason = 'other') }
ReactivateParty { partyId, expectedVersion, reasonNote: string (10–500) }
```

Import reversal sends `reason: 'other'` with a note naming the batch, and is subject to the same obligation check.

**Read `GET /v1/parties/:partyId/archive-preview`** (archive or reactivate authority). Response:

```text
{ partyId, version, status,
  obligations: { openOrders, openCommitments, openIssues, openWorkItems },   // counts
  payments: { checked: false, reason: 'payments_not_available' },
  blocked: boolean,                                   // any obligation count > 0
  effects: { openOpportunities, openQuotes, currentContacts } }
```

**Archive.**

- Recomputes obligations inside the transaction. If any exist → `ARCHIVE_BLOCKED_BY_OBLIGATIONS` (409). There is no transfer path in this slice; obligations must be resolved first (A2 §6 permits blocking).
- Effects: `status = 'inactive'`, `version + 1`, event `party.deactivated` `{reason, reasonNote, obligationsChecked}`.
- Never deletes, never changes the owner or ownership history, never ends coverage grants, never cancels quotes or opportunities. Archiving is never automatic.

**Reactivation.**

- Effects: `status = 'active'`, `version + 1`, event `party.reactivated` `{reasonNote}`.
- Restores nothing:
  - coverage grants keep their own windows;
  - quote prices and expiry are unchanged;
  - no credit exists to restore;
  - follow-up preferences are unchanged;
  - closed opportunities stay closed;
  - no new customer record is created.

**Limitations.**

- Orders have no completed state, so any non-cancelled order blocks archive until an order lifecycle exists.
- Payments are unchecked and reported as such, never as zero.
- The "include archived" search filter is not part of this backend slice.

## L4 — Correction requests (on `os-issue`)

**Existing model.**

- `OsIssue`: states `reported`, `triaged`, `in_progress`, `resolved`, `closed`, `reopened`; plus owner, journal, `resolution` and `outcome`.
- References may point to a `party`.
- `ReportIssue` is open to any active member; triage, assign and close need `issue.manage`; resolve is for the owner or `issue.manage`.

No second ticket system is introduced.

**Extension.**

- `ReportIssue` accepts optional `correction`:

  ```text
  correction: { partyId, contactId?, locationId?,
    field: 'display_name' | 'legal_name' | 'fiscal_identity' | 'contact_name' | 'contact_email'
           | 'contact_phone' | 'contact_whatsapp' | 'location_address' | 'location_city' | 'other',
    proposedValue: string (≤ 500, restricted), source: 'customer' | 'staff' | 'document' }
  ```

  - The reporter must be able to see the customer, and a named contact or location must belong to it (else `NOT_FOUND`). The party reference is linked automatically.
  - It is stored in a one-to-one restricted record keyed by issue id (`os_issue_correction_requests`). `proposedValue` is never copied into events. `GET /v1/issues/:issueId/correction` requires issue read access and customer knowledge (else 404); `proposedValue` is shown to the reporter, to whoever may apply the change and to `issue.manage`, and is `null` for others.
- Responsible person: `AssignIssueOwner` requires that the owner knows the customer and can apply the change. That means customer `edit` authority over that party or `master_data.admin`; `master_data.admin` for `legal_name`; and `fiscal.admin` for `fiscal_identity`, which is the scope `UpdateFiscalIdentity` already requires (aligned at implementation, `22608eb6`). No new scope is introduced; A2's proposed `commercial.data_correction.review` is not needed while application authority is the gate.
- State mapping:
  - Pendiente = `reported` / `triaged`;
  - En revisión = `in_progress`;
  - Resuelta = `resolved` with `outcome = 'applied'`;
  - Rechazada = `resolved` with `outcome = 'rejected'`.
- Resolution: `ResolveIssue` on a correction requires `correction: { decision: 'applied' | 'rejected', appliedEventId?, reason (10–500) }`.
  - `applied` requires `appliedEventId`: a business event on the same party, contact or location, recorded after the request, by an authorized actor, with type in {`party.updated`, `party.fiscal_identity.changed`, `contact.updated`, `contact.endpoint.changed`, `contact.endpoint.retired`, `location.updated`}.
  - Closing with text alone is refused. The resolver (owner or `issue.manage`) must also be able to apply the change.
  - The outcome is the decision; `RecordIssueOutcome` is refused on a correction. `ReopenIssue` clears the decision and outcome (the event history keeps the earlier decision).
  - Without the customer-authority port, correction commands fail closed.
- The request never writes customer data itself. The change goes through the normal domain command and its authority.
- Payments, quotes, orders and issued documents are not correction fields. Those need their own reversal or revision workflows (A2 §4).
