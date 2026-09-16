# LANE B — Pedido timeline + document dossier receipt

**When:** 2026-09-16  
**Branch:** `lane-b/pedido-timeline-docs`  
**Base tip:** `5ca147207508c93f083e6cf141547f54c45e6eb0` (`pre-pilot/company-os-pass`)  
**Worktree:** `.worktrees/lane-b-pedido-timeline-docs`  
**SHA:** `206436cad15ce336da11b2ef08fc0c4404de7167`  
**Branch tip (receipt inclusive):** see `git rev-parse lane-b/pedido-timeline-docs`  
**Lane:** Pedido Historial projection + Client/Pedido document dossier (metadata + PDF links)  
**Deploy:** NO · **Staging DB migrate:** NO · **REAL_SEVEN_MUTATED:** NO

---

## Mission outcomes

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Pedido timeline projects durable BusinessEvents (order created, FG received, delivery_note.created, salida, entrega, work/issue where linked); Spanish labels; deep-links; no raw event names; no fake inferred history | **IMPLEMENTED · TESTED** |
| 2 | Reuse Quote PDF + Nota PDF routes in Client/Pedido document dossier without duplicating blobs | **IMPLEMENTED · TESTED** (metadata + links) |
| 3 | Cliente360 HISTORIAL / DOCUMENTOS surface Quote PDF / Nota PDF / send evidence when durable | **IMPLEMENTED** · hosted BV **UNPROVEN** |

---

## Proof matrix (do not collapse)

| Capability | PLANNED | IMPLEMENTED | TESTED | INTEGRATED | DEPLOYED | HOSTED | BROWSER-VERIFIED | USER-ACCEPTED |
|------------|---------|-------------|--------|------------|----------|--------|------------------|---------------|
| Pedido timeline mapping (labels + links) | yes | yes | yes (unit) | code on branch | no | no | no | no |
| Pedido chronology uses mapped items (no raw `eventType` detail) | yes | yes | yes | code on branch | no | no | no | no |
| Document dossier Quote/Nota PDF links | yes | yes | yes (unit) | code on branch | no | no | no | no |
| Send evidence when `quote.send_recorded` durable | yes | yes | yes (unit) | code on branch | no | no | no | no |
| Cliente360 DOCUMENTOS section | yes | yes | logic unit | code on branch | no | no | no | no |
| Cliente360 HISTORIAL deep-links | yes | yes | logic unit | code on branch | no | no | no | no |
| Binary PDF archival / blob store | n/a | **NO** | n/a | n/a | n/a | n/a | n/a | n/a |

---

## What was extended (not replaced)

- Reused existing Spanish timeline label surface (`timeline-labels.ts`) — added delivery/salida/entrega labels.
- Reused party timeline projection + delivery-notes timeline SoR; mapped via `projectPedidoTimeline` (filter by durable `orderId` / subject / issue reference).
- Reused existing PDF routes: `/api/quotes/:id/pdf`, `/api/delivery-notes/:id/pdf` (pdf-lib on demand).
- Reused `@isalwa/ui` `ListRow` / `EmptyState` / `PageSection` / `Timeline`.
- Did **not** invent order.created from row timestamps alone.
- Did **not** add fiscal numbering, localStorage truth, `people.admin`, or a new storage provider.

---

## Key paths

- `apps/os-web/lib/commercial/pedido-timeline.ts` (+ `.test.ts`)
- `apps/os-web/lib/commercial/document-dossier.ts` (+ `.test.ts`)
- `apps/os-web/lib/commercial/timeline-labels.ts`
- `apps/os-web/components/commercial/document-dossier-panel.tsx`
- `apps/os-web/components/commercial/party-timeline-list.tsx`
- `apps/os-web/components/delivery/delivery-documents-panel.tsx`
- `apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx`
- `apps/os-web/app/(app)/clientes/[partyId]/page.tsx`
- `apps/os-web/components/cliente/cliente-360-nav.tsx`

---

## Tests run

```text
pnpm exec tsx --test \
  lib/commercial/pedido-timeline.test.ts \
  lib/commercial/document-dossier.test.ts \
  lib/commercial/ui-4.test.ts \
  lib/commercial/ui-4b.test.ts
→ 47 pass / 0 fail
```

---

## Residual (honest)

1. **Binary archival missing:** PDFs are generated on demand from durable Quote / Nota records. There is no separate blob archive, content-addressed store, or immutable PDF snapshot table. Dossier surfaces metadata + route links only.
2. **Cliente360 Nota PDF load:** notes are fetched per open Pedido (up to 10) via existing `GET /delivery-notes?orderId=`. Failures omit notas for that order; no invented empty archive.
3. **Issue events on party timeline:** Issue types are not in `PARTY_TIMELINE_EVENT_TYPES`. Pedido chronology includes linked issues only when the durable Issue record references the order.
4. **Hosted / browser proof:** UNPROVEN (no deploy this lane). Delivery/FG outbox → party timeline projection remains dependent on prior Agent 2/3 wiring + staging migration apply (not this lane).
5. **Work linked to order:** Work subject registry does not include `order`; work appears on Pedido timeline only when party-timeline facts already carry `orderId` or approval `subjectType=order`.

---

## Constitution checks

| Check | Value |
|-------|-------|
| REAL_SEVEN_MUTATED | **NO** |
| Fiscal numbering invented | **NO** |
| localStorage as truth | **NO** |
| people.admin | **NO** |
| Parallel component system | **NO** |
| Deploy / staging migrate | **NO** |

---

## Unblock for Control Tower

1. Integrate branch into pre-pilot tip; deploy os-web (and os-api if needed for notes list).
2. Browser-verify Pedido chronology + Documentos + Cliente360 DOCUMENTOS/HISTORIAL @1440/@390 with SYNTH data.
3. Confirm delivery/FG BusinessEvents land in party timeline projection on hosted (Agent 2/3 residual).
