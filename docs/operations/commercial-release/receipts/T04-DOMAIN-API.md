# T04 — domain and API (quote lifecycle)

Authority: `CONTINUATION-2026-11-16.md` §8, `REUSE_MAP.md` §13.5. Branch `ct3/v1-repairs`. Nothing pushed or deployed; only the disposable database was migrated.

## 1. Lifecycle

draft → approval of the exact terms → issuance (`SubmitQuote`) → optional manual send → customer acceptance (`RecordQuoteCustomerAcceptance`) → `CreateOrder`.

No Sale entity and no second approval system: the existing `OsApprovalRequest` and `WorkCommandService` carry the approval.

| Step | Rule |
|---|---|
| Request approval | Quote must be `draft`. The requester cannot name themselves. The approver must hold `commercial.price.approve` through a role assignment. No default approver. `contextSnapshotJson.boundRevision` records the quote revision. |
| Approve | The requester cannot decide. The quote is reloaded: not draft, or `boundRevision` ≠ current revision → `CONFLICT`. |
| Material change | Lines (add, update, remove), header discount, `validUntil` bump `revisionNumber` only on a real change. Older approvals are void. A pending request for an older revision stays open until someone rejects it; a new request for the current revision is not blocked by it (open-request claim is per quote revision). |
| Issue | Draft, no earlier issuance (`CONFLICT`), ≥ 1 line, an approved approval whose `boundRevision` equals the current revision (`VALIDATION_FAILED`). Sets `issuedAt`, `issuedRevisionNumber`, `issuedDocumentHash` (sha256 of the stable JSON snapshot, `quote-issuance.ts`). |
| Record acceptance | Issued quote only. `expectedRevision` must equal the revision (`CONFLICT`). Channel enum, `acceptedOn` date inside issuance/validity, evidence 10–500 chars. Emits `quote.customer_acceptance.recorded`. |
| Create order | Status `accepted`, `customerAcceptedRevision` = revision = issued revision, a current approval, existing owner/convert authority paths unchanged. A second or concurrent conversion → `CONFLICT` (unique `(organization_id, quote_id)` on `os_orders`). |

## 2. Migration

`20261020000000_os_quote_issuance_acceptance_t04`: eight nullable `os_quotes` columns (issued_at, issued_document_hash, issued_revision_number, valid_until, customer_accepted_at, customer_acceptance_channel, customer_acceptance_evidence, customer_accepted_revision) and the unique index on `os_orders`. Applied to the disposable database only. `EXPECTED_MIGRATION_COUNT` was 40 here and is 41 after the UI step added a read-model migration (see `T04-UI.md`). The tracked generated Prisma client was regenerated.

## 3. Legacy quotes

No backfill and no bulk relabel. A quote already `submitted` before this change has `issuedAt` NULL, so it cannot be accepted or converted until it is issued under the new rules. The unique index fails loudly if a legacy tenant holds two orders for one quote.

## 4. Known gaps (left for later work)

- The UI is wired in `T04-UI.md`. Its remaining gaps are listed there.
- The quote PDF is rendered from the read model: it does not print discount, units or validity, and it is not tied to `issuedDocumentHash`. A draft is still labelled "Borrador".
- The read model and timeline labels in `os-web` (`party-timeline-facts`) do not show issuance or acceptance fields yet.
- The price approval "range" is not modelled; any holder of `commercial.price.approve` may approve.
- An `accepted` quote cannot be cancelled (existing rule for `accepted`).
