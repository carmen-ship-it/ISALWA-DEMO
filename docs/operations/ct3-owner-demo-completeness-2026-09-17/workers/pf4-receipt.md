# PF-4 receipt — Document/PDF normal-product verification

**Lane:** PF-4  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-pf4-pdf-verify`  
**Branch:** `ct3/pf4-pdf-verify`  
**Base:** `6327f43c57f309227906931f6cc08ae54033410e`  
**At:** 2026-09-17  
**Deployed:** NO  
**REAL_SEVEN_MUTATED:** NO  
**Hosted:** **UNPROVEN** (code PASS ≠ hosted PASS)

## Verdict

| Field | Value |
|---|---|
| QUOTE_PDF_SCOPE | **NORMAL PRODUCT** |
| DELIVERY_NOTE_PDF_SCOPE | **NORMAL PRODUCT** |
| DEMO_USES_SAME_PDF_IMPLEMENTATION | **YES** |

No demo-only PDF implementation found. No product defect requiring a fix. Proof tests added only.

## Shared route / controller / module paths

### Web (BFF proxy)

- `apps/os-web/app/api/quotes/[quoteId]/pdf/route.ts` → `OsApiClient.getQuotePdf` → `GET /quotes/:quoteId/pdf`
- `apps/os-web/app/api/delivery-notes/[id]/pdf/route.ts` → `OsApiClient.getDeliveryNotePdf` → `GET /delivery-notes/:id/pdf`

### API (SoR render)

- `apps/os-api/src/commercial.controller.ts` — `@Get(':quoteId/pdf')` → `QuotePdfService.renderAuthorizedQuote`
- `apps/os-api/src/quote-pdf.service.ts`
- `apps/os-api/src/delivery.controller.ts` — `@Get(':id/pdf')` → `DeliveryNotePdfService.renderAuthorizedNote`
- `apps/os-api/src/delivery-note-pdf.service.ts`

### Shared PDF providers

- `packages/providers/src/pdf/quote-pdf-document.ts`
- `packages/providers/src/pdf/delivery-note-pdf-document.ts`
- `packages/providers/src/pdf/pdflib.ts`

### Cliente360 Documentos (same route family)

- `apps/os-web/lib/cliente/document-links.ts` — builds `/api/quotes/{id}/pdf` + `/api/delivery-notes/{id}/pdf`
- `apps/os-web/components/cliente/cliente-360-documentos.tsx` — Ver PDF / Descargar bind to `viewHref` / `href`
- `apps/os-web/components/commercial/quote-pdf-download-button.tsx` — same quote route family

### DEMO MADERAS ORIENTE (same implementation)

- Seeded party `01M2PM95PV7YP6AECYXSX4GRBW` (DEMO MADERAS ORIENTE)
- Quote `01M2PM9KSJXN1K4CF45FT0H299` → `/api/quotes/01M2PM9KSJXN1K4CF45FT0H299/pdf`
- DN `01M2PMCSNXH644P1C4F832BGKQ` → `/api/delivery-notes/01M2PMCSNXH644P1C4F832BGKQ/pdf`
- Documentos tab: `/clientes/01M2PM95PV7YP6AECYXSX4GRBW?tab=documentos`
- Evidence: `apps/os-web/lib/demo/seeded-ids.json` `hrefHints.quotePdf` / `hrefHints.deliveryNotePdf`
- Story Mode PDF steps resolve to the same `/api/.../pdf` family (`story-mode-steps.ts`)

## Tests (local code)

| Suite | Result |
|---|---|
| `lib/cliente/document-links.test.ts` (3) | **PASS** |
| `lib/demo/pf4-pdf-same-implementation.test.ts` (3) | **PASS** |
| `lib/commercial/quote-pdf-ui.test.ts` (3) | **PASS** |
| `lib/commercial/document-dossier.test.ts` (3) | **PASS** |
| `lib/demo/owner-demo.test.ts` (4) | **PASS** |
| `packages/providers` quote + DN PDF (8) | **PASS** |
| `apps/os-api` `quote-pdf.service.test.ts` | **SKIPPED** — worktree missing package dist graph (`@isalwa/providers` / `@isalwa/ts-utils`); not a product defect |

Commands:

```bash
cd apps/os-web && pnpm exec tsx --test \
  lib/cliente/document-links.test.ts \
  lib/demo/pf4-pdf-same-implementation.test.ts \
  lib/commercial/quote-pdf-ui.test.ts \
  lib/commercial/document-dossier.test.ts \
  lib/demo/owner-demo.test.ts

cd packages/providers && pnpm exec tsx --test \
  src/pdf/quote-pdf.test.ts \
  src/pdf/delivery-note-pdf.test.ts
```

## Residuals

1. Hosted browser verify of DEMO MADERAS Documentos Ver/Descargar PDF — **UNPROVEN**.
2. os-api quote-pdf service test not re-executed in this fresh worktree (dist graph); providers PDF unit tests cover render path.

## Collision hygiene

- Did **not** create demo-only PDF routes or static PDF assets.
- Did **not** redesign PDF architecture.
- Did **not** mutate REAL tenant / REAL seven.
- Did **not** deploy.
