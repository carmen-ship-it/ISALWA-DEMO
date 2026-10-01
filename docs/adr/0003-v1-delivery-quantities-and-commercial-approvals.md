# ADR 0003 — V1 delivery quantities, commercial approvals, and operational scope

## Status

Accepted — owner decision 2026-10-01, during the V1 security and integrity repair wave.

Supersedes the deliberate "cumulative quantity is not checked" note in
`packages/os-contracts/src/delivery.ts`. Until this decision there was no
approved policy, so the absence of a cumulative check could not be treated as a
defect on its own.

## Context

An independent review of the V1 source (SHA `52a9f9e`) reported that delivery
quantities are validated per document against the order line but never against
the running total, that approvals do not gate any commercial action, and that
the Compras purchase-request queue is a process-local in-memory array with no
writers. Each of those needed a product rule before any repair could be chosen.

## Decision

### Delivery quantities

- Partial dispatches are allowed.
- Cumulative committed dispatch quantity must not exceed the current confirmed
  order-line quantity.
- Draft delivery notes do not count as dispatched.
- The limit is enforced atomically at dispatch, including concurrent requests.
- Recording receipt of an existing dispatch must not count the quantity again.
- An authorized, audited reversal restores dispatchable quantity.
- A customer return does not by itself authorize a replacement dispatch.
- Additional quantity requires an authorized, recorded order revision first.
- Historical deliveries are not rewritten. Already over-delivered orders are
  identified separately and blocked from further excess dispatch.

### Commercial approvals

- Authorized users may prepare and edit draft quotes.
- Transactions inside approved pricing/discount rules need no extra approval.
- A manual exception requires approval before the quote is presented or sent as
  an authorized offer.
- Conversion rechecks that the relevant approval is still valid.
- Where no approved pricing/discount limits exist, every manual price or
  discount override requires owner approval. A missing pricing basis is never
  treated as an automatically approved price.
- A requester cannot approve their own exception.
- An approver needs explicit company-scoped authority.
- Approval binds to the commercial terms reviewed. A change to price, discount,
  quantities, or other approval-relevant terms invalidates it.
- Requester, approver, reason, reviewed terms, and timestamps are preserved.
- Purchasing-preparation reviews are operational reviews, not commercial price
  approvals.
- Approvals are never fabricated for existing records. Any pending quote whose
  next action becomes blocked by these rules is reported instead.

### V1 operational scope

The journey quote → order → Producción → Almacén → Compras resolution →
Entregas → customer history must work end to end, with persisted state for
production context and readiness, warehouse receipts/availability/dispatch
movements without duplicates, purchasing requests/reviews/assignments/linked
orders/outcomes/history, and delivery notes with dispatch, receipt,
corrections/reversals, PDFs, quantity controls and audit. External purchasing
resolution must state explicitly that no internal purchase order was created.
Cliente 360 and Inicio show the committed state under the right permissions.

Sound existing implementations are extended, not replaced; an unused package is
not a reason to rebuild a working desk. Every active action performs a durable
authorized operation and shows its result — required functionality is not
"complete" by hiding a button or leaving an unwritten in-memory queue.

Out of scope for V1: advanced manufacturing scheduling, a new warehouse system,
a full procurement/accounts-payable suite, fiscal invoicing. The Map,
Administración and Auditoría holds stand; security defects in reachable
functionality are repaired without expanding held features.

## Consequences

- Dispatch gains a cumulative quantity check that must hold under concurrency,
  so the check belongs in the same transaction as the dispatch write.
- Reversal and receipt become quantity-relevant states and need to be
  distinguishable from dispatch in persisted data.
- Approval records must carry a fingerprint of the reviewed terms so that a
  later edit can invalidate them, and conversion must re-check validity.
- Over-delivered orders predating this decision are reported, not corrected.
- Regression tests reference this ADR by number where they encode a rule here.
