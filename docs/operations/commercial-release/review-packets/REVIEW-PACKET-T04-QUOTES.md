# Review packet — T04 quote lifecycle (Batch 3 / 3B)

Prepared by the integrator 2026-11-17. Reviewer must be distinct from the integrator. Review the **source already on `ct3/v1-repairs`**, not a parallel rewrite.

## Pins

| | |
|---|---|
| Implementation parent | Batch 3 receipt `receipts/BATCH-3-T04-QUOTES.md` (parent Batch 2 `5737c17b`) |
| PDF hash pin | Batch 3B `receipts/BATCH-3B-PDF-HASH-PIN.md` (`a1fceaa0`) |
| Frozen evaluation deploy SHA (historical packet context) | Was `5e7131cc…` when this packet was written. **Current** hosted product tip is `904cf24a…` / deploy `dpl_E8wQPK77…`. Do **not** auto-promote unreviewed fixes to Vercel. |
| Governing | V2 quote/order path; A1 lifecycle; `REUSE_MAP.md` §12 authority; continuation §8 |

## Required behavior to verify

1. draft → Solicitar aprobación (exact revision; `commercial.price.approve`; **no self-approval**)
2. Emitir creates issued revision + document hash; issue ≠ send
3. Descargar PDF verifies `issuedDocumentHash` (3B); mismatch → 409
4. Registrar aceptación records channel/date/evidence for exact revision
5. Crear pedido requires acceptance + current approval; single order per quote; ownership/actor retained
6. Term changes invalidate affected approvals
7. Coverage convert only with explicit `quote.convert` + actor conversion permission
8. No parallel “sale” entity; no fake WhatsApp/PDF/payment success

## Integrator local re-check (2026-11-17)

| Check | Result |
|---|---|
| `packages/os-commercial` npm test (includes `quote-lifecycle-t04.test.ts`) | **132/132 pass** |
| Independent review | **PASS WITH FOLLOW-UPS (external)** — formal `receipts/REVIEW-T04-QUOTES.md` absent; see `receipts/T04-INDEPENDENT-REVIEW-PROVENANCE.md`. Do not treat as not started. |
| Hosted product pin (current evaluation) | Tip `904cf24a…` on https://isalwa-os-web-evaluation.vercel.app (deploy `dpl_E8wQPK77…`). Older freeze `5e7131cc` is historical packet context only. |
| Real first approver identity | **BLOCKED** (business decision D1; synthetic scope only) |
| Price-approve **range** | **OPEN** (D2; any scope holder may approve today until thresholds exist) |

## Known gaps (confirm or refute; do not invent policy)

- Price-approve range modelling
- Real approver identity / thresholds for live activation
- Blob storage for immutable PDF bytes (hash pin exists; full artifact store open)
- Status pill “Enviada” for submitted/issued — **historical gap**; promote-hygiene / fixture work moved product wording to **Emitida** (treat as superseded for labels; confirm on hosted UI)

## Verdict format

PASS, PASS WITH FOLLOW-UPS, or FAIL. Blocking vs follow-ups with file:line evidence.
Write receipt to `docs/operations/commercial-release/receipts/REVIEW-T04-QUOTES.md` (or transfer-readiness mirror). Read-only review: no edits to the frozen Vercel deployment.
