# LANE CT3-G — Map / Management / freshness / progress (receipt)

**Date:** 2026-09-17  
**Lane:** CT3-G writer  
**Branch:** `ct3/lane-g-map-mgmt`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-g-map-mgmt`  
**Base:** `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b`  
**LANE_IMPLEMENTATION_SHA:** `6519354c763d2b1447f432671fc2960795b57e2d` (`6519354`)
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy / migrate:** not performed (lane receipt only)

---

## Carmen plain language

Map hover and drawer now show **Valor cotizado / Valor de pedidos** (never ingresos), human **Ubicación por confirmar** cards, and drawer CTAs (Cliente360 / seguimiento / conversación stub). Management Empresa lens gets a **count-only** commercial funnel plus separated value metrics. Inicio uses semantic visual bands. Freshness and process steppers are deterministic — **no fake % or revenue**.

---

## Delivered

| Capability | Proof state |
|---|---|
| Map value labels (Valor cotizado / Valor de pedidos) when encoded | **IMPLEMENTED** + **TESTED** |
| Marker hover tooltip (client, responsible, counts/values, attention, status) | **IMPLEMENTED** + **TESTED** (hover model) |
| Drawer CTAs + pending location card | **IMPLEMENTED** + **TESTED** |
| Atención map layer (deterministic attention party set) | **IMPLEMENTED** + **TESTED** |
| Management funnel counts Oportunidades → Cotizaciones → Pedidos | **IMPLEMENTED** + **TESTED** |
| Separated org metrics: opportunity/quoted/order values | **IMPLEMENTED** + **TESTED** |
| Inicio visual bands (attention / mi-día / commercial / ops / …) | **IMPLEMENTED** |
| Freshness display helpers | **IMPLEMENTED** + **TESTED** |
| Deterministic commercial/delivery process steppers (no %) | **IMPLEMENTED** + **TESTED** |
| Hosted / browser verify | **UNPROVEN** this SHA |

---

## Files changed

### Map
- `apps/os-web/app/(app)/mapa/page.tsx` — hover snapshots, attention party ids, issue count
- `apps/os-web/components/map/map-experience.tsx` — attention filter, hover passthrough, drawer enrichment
- `apps/os-web/components/map/map-live-canvas.tsx` — rich hover tooltip
- `apps/os-web/components/map/map-marker-tooltip.tsx`
- `apps/os-web/components/map/map-party-drawer.tsx`
- `apps/os-web/components/map/map-quick-view-compact.tsx` — pending card, CTAs, process steps, freshness
- `apps/os-web/components/map/map-pending-location-card.tsx`
- `apps/os-web/components/map/map-customer-lists.tsx` — human location copy
- `apps/os-web/lib/map/hover-model.ts` (+ test)
- `apps/os-web/lib/map/pending-location.ts` (+ test)
- `apps/os-web/lib/map/layers.ts` — Atención available
- `apps/os-web/lib/map/index.ts`
- `apps/os-web/lib/map/map-desk.test.ts`

### Management / Inicio
- `apps/os-web/app/(app)/inicio/page.tsx` — visual bands + funnel wiring
- `apps/os-web/components/inicio/inicio-visual-band.tsx`
- `apps/os-web/components/management/management-commercial-funnel.tsx`
- `apps/os-web/components/management/management-org-metrics.tsx`
- `apps/os-web/lib/management/org-metrics.ts` (+ test)
- `apps/os-web/lib/management/commercial-funnel.ts` (+ test)
- `apps/os-web/lib/management/improvement-insights.ts`
- `apps/os-web/lib/management/example-preview.ts`

### Freshness / progress
- `apps/os-web/lib/freshness/display.ts` (+ test)
- `apps/os-web/components/freshness/freshness-label.tsx`
- `apps/os-web/lib/progress/process-steps.ts` (+ test)
- `apps/os-web/components/progress/process-step-indicator.tsx`

### Docs
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/lane-g-receipt.md`

---

## Tests run (local)

```text
pnpm --filter @isalwa/ts-utils build
pnpm --filter @isalwa/providers build
pnpm exec tsx --test \
  lib/map/hover-model.test.ts \
  lib/map/pending-location.test.ts \
  lib/map/map-desk.test.ts \
  lib/management/commercial-funnel.test.ts \
  lib/management/org-metrics.test.ts \
  lib/freshness/display.test.ts \
  lib/progress/process-steps.test.ts
→ 22+ pass / 0 fail (map-desk suite included)
```

---

## Blocked items

None for this lane’s write scope. Hosted MAP_BV / management visual proof remains for CT / verifier after integrator merge + deploy.

---

## Residuals

- `selectedLastUpdatedIso` on map page is still `null` until a factual party update clock is available to pass through (FreshnessLabel wired, data not yet sourced).
- Delivery process stepper helper is ready; map drawer uses commercial chain only (no delivery facts on map snapshot).
- Example preview metrics remain synthetic / watermarked — never merged into live composers.
- No deploy from this lane. REAL_SEVEN untouched.
