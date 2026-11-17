# Receipt — Batch 3B PDF hash pin

Date: 2026-11-17. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Continuation §8 leftover from `BATCH-3-T04-QUOTES.md`.

States: **IMPLEMENTED** · **TESTED LOCALLY** (unit). Not independently reviewed. Not hosted.

## What changed

| Concern | Behavior |
|---|---|
| Hash pin on download | For quotes with `issuedDocumentHash`, `QuotePdfService` reloads canonical quote + lines from `OsCommercialStore`, recomputes `quoteIssuedDocumentHash`, and refuses with `ISSUED_DOCUMENT_MISMATCH` (HTTP 409) when it does not match the frozen hash. |
| PDF content | Printable document now includes units, line discounts, header discount, validity (`Válida hasta`) and issued revision when present. No invented bank details or guarantees. |
| Draft / legacy | Quotes without an issued hash still render from the authorized read model; `issuedDocumentVerified` is false. |
| UI disclosure | Copy states that download rechecks the hash and withholds the PDF on mismatch; contact display name may still refresh. |

## Checks

| Check | Result |
|---|---|
| `packages/os-commercial` `quote-lifecycle-t04.test.ts` | 26/26 |
| `packages/providers` `quote-pdf.test.ts` | 7/7 |
| `apps/os-api` `quote-pdf.service.test.ts` | 7/7 (pin + mismatch + enrichment) |
| `apps/os-web` `quote-lifecycle.test.ts` | 11/11 |

## Limits kept distinct

- Hash covers **material commercial terms**, not raw PDF bytes. Presentation fields (party display name / contact) are still loaded live; a rename can change those labels without changing the hash.
- Storing immutable PDF bytes / a full presentation snapshot at Emitir is still open (blob storage decision).
- Price-approve **range** and real approver identity remain open (unchanged).
- No push, deploy, or real customer data.

## Next

Batch 5 leftovers (Nota interna / attention states) and Batch 8 Cliente 360 header continue in parallel. Independent review of Batches 2–9 remains separate.
