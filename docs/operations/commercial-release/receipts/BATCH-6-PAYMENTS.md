# Receipt — Batch 6 / T07 reported payments, per-tender verification, allocations, payment instructions

Date: 2026-11-16. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD: `a66f2bf0`. Authority: `CONTINUATION-2026-11-16.md` §11.

States: **IMPLEMENTED** · **TESTED LOCALLY** (unit + HTTP over a real Nest app + disposable Postgres + production `next build`). Not independently reviewed. Not browser-verified. Not pushed, not deployed.

Scope: operational payment *reporting* plus *human verification* on `/finanzas`. It is not bank integration, not tax invoicing, not a ledger, and does not execute refunds. It extends the existing `os_reported_operational_facts` (kind `payment`) and the `/finanzas` desk; no parallel finance system.

## Shipped

| Requirement | What exists |
|---|---|
| **Registrar pago reportado** | Form on `/finanzas`: customer (server typeahead), optional order of that customer, BOB total, date, one or more tenders (method, amount, reference), private evidence, note. Tender amounts must be positive integers of centavos and sum **exactly** to the total (`PaymentReportInputSchema`, same check in the API and as a live difference hint in the form). **QR 200 + cash 1070 = 1270** is an HTTP-proven case. |
| **Cash recipient** | A cash tender needs a known recipient member **or** an explicit "unresolved" reason; neither is guessed. A verifier can later resolve the recipient (`resolve-recipient`). |
| **Per-tender verification** | Each tender has its own outcome (`pending` / `confirmed` / `rejected` / `reversed`) in an append-only event log. The report state is **derived** (`derivePaymentReportTotals`): confirmed / pending / rejected / reversed / allocated / unassigned centavos. There is no single `confirmed` flag on the report. A report, a screenshot, an uploaded image or the customer's word never confirms anything. |
| **Authority** | Explicit scopes only, assigned as role keys: `payments.report` (author, read own), `payments.confirm` (verify, queue, allocate, reverse), `commercial.payment_instructions.publish` (A1 publication). Never cargo or title. Advisors report and read their outcomes; they cannot confirm, reject, allocate or open the queue. A verifier-only member cannot author a report. Self-verify is **not** blocked (see gaps). |
| **Por verificar** | Scoped queue (`GET /v1/payment-reports?view=queue`) for `payments.confirm` without customer-wide read; drops a report when its last pending tender is decided. Internal notifications: `payment_to_verify` (verifiers; resolved when no tender is pending) and `payment_outcome` (reporter and account owner). |
| **Concurrency and retries** | Conditional `updateMany`: two simultaneous verifiers have one winner; the loser gets 409. Re-confirming the same tender is not a second outcome. `Idempotency-Key` on record and allocation: same key + same body returns the same result once; same key + other body conflicts. A same-reference or same-file report is **flagged** as a possible duplicate, never blocked or merged. |
| **Reversal** | Correcting confirmed funds is an authorized reversal with a reason plus an optional **linked replacement** report. The original and its outcomes remain. Active allocations must be released first. |
| **Anticipos / allocations** | Explicit: a verifier picks the order(s) and amounts. Orders must be of the same customer and tenant. No over-allocation (API **and** DB trigger). The remainder stays unassigned. Nothing is auto-assigned to the most recent order. Release is explicit and keeps history. |
| **Private evidence** | Stored as `bytea`, type decided by file signature (not name or header), size capped, served only to those who can read the report with `no-store`, `nosniff` and CSP sandbox. Strangers get 404. Evidence never confirms. |
| **Payment instructions** | Versioned public config: draft → published (drafter ≠ publisher) → retired. A QR version needs its file. Publishing a replacement retires the old one. With nothing approved the desk shows **"No hay instrucciones de pago aprobadas para compartir"** and offers no account, QR or text. The developer account is never used. Copy goes through a share-check (`409 INSTRUCTIONS_CHANGED` if the approved version changed). |
| **Customer archive reconnection** | `GET /parties/:id/archive-preview` no longer says payments are "not available". It now counts `pendingPayments` (reports with a tender to verify) and `unassignedPayments` (reports with confirmed funds not fully allocated), both of which **block archiving** (`customerArchiveBlocked`, also used by the import path). The archive event records `paymentsChecked: true`. The panel states these are "pagos reportados en ISALWA… No es el saldo contable del cliente" and never shows a zero as an accounting balance. |
| **Web wiring** | `/finanzas` desk shows the form, the "Por verificar / Todos" list with per-tender actions and allocations, and the instructions card (incl. publisher admin). The old operations manual payment form is replaced by a link to the desk (`manual-payment-form.tsx` and `load-subject-options.ts` deleted). Access matrix rows, role presets (asesor reports, finanzas confirms) and the contabilidad lens updated. Copy guarded by the finance forbidden-copy test. |

## Schema / migration (disposable only)

- `20261022000000_os_payment_reports_t07`: tables `os_payment_tenders`, `os_payment_tender_events`, `os_payment_evidence`, `os_payment_allocations`, `os_payment_instruction_versions`; extra columns on the reported fact (idempotency fingerprint, possible-duplicate flag, replacement link); triggers: tender immutability and legal state transitions, append-only event log, same-customer allocation guard, over-allocation limit.
- `EXPECTED_MIGRATION_COUNT` 42 → 43. Applied only to `isalwa_stage_a_disposable` @ 54329. Prisma client regenerated.

## Checks

| Check | Result |
|---|---|
| `batch6-payments.http.test.ts` (new, real Nest + PG) | 18/18: QR+cash report; invalid reports write nothing; retry/parallel retry; duplicate flag; advisor cannot confirm/reject/allocate; tenant isolation; customer-orders listing; partial verification; simultaneous verifiers; rejection; reversal + linked replacement; allocation limits + DB guards; private evidence; queue + notices + reload reads; instructions versioning; archive-check feed |
| `os-contracts` | 243/243 (`payment-report.test.ts` 23) |
| `os-party` / `os-import` | 38/38, 32/32 |
| `os-database` (disposable PG, concurrency 1) | 315/315 |
| `os-web` | 1380/1380; `tsc --noEmit` exit 0; `next build` exit 0 |
| `os-api` typecheck | exit 0 |
| `os-api` full suite, `--test-concurrency=1` | **389/389** |
| `os-api` full suite, default parallel | 386–388 of 389, different T03/B1 HTTP files each run; each passes alone and the serial run is green. Same shared-DB parallel flake already recorded in `BATCH-5-CONVERSATIONS.md`; not attributed to this batch (no baseline parallel run was made on the parent). |
| Lint | Not run: `os-web` has no ESLint config in this repo. |

## Honest gaps / blockers

1. **No approved payment instructions exist.** Nobody has published an account or QR (A1 publication authority). Sharing therefore stays in the absent state. Nothing in the repo can stand in for them.
2. **No cash-receiver roster.** A cash tender names any member or records an unresolved reason; there is no list of authorized receivers to validate against.
3. **No self-verify block.** The same member holding both `payments.report` and `payments.confirm` can confirm their own report. Separation relies on role assignment; a rule is not yet specified.
4. **Share is a check, not an outbound.** There is no send/queue to a customer; the copy is manual after the share-check.
5. **Instruction admin lives on `/finanzas`** because the T05 knowledge route is blocked (`BATCH-4-CATALOG-BLOCKED.md`).
6. **Not an accounting balance.** "Pagos registrados en ISALWA" is operational reporting only; no ledger, no receivable, no invoice, no bank match. **No refund is executed**; reversal only records the correction.
7. `SESSION_CAPABILITY_SCOPES` (`member-capabilities.ts`) is unchanged: the three payment scopes are read from granted scopes directly and do not need that list.
8. Not browser-verified, not independently reviewed, not pushed. Synthetic/demo rosters (`staging-carmen-synth-demo-scopes.ts`) were deliberately not given payment scopes.
