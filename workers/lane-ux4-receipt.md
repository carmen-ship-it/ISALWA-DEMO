# LANE UX-4 — Map desk receipt

**Date:** 2026-09-16  
**Branch:** `ct2/lane-ux4-map`  
**Base:** `1244d84ef75142d973c8f7aa44caeadd66361768`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct2-lane-ux4-map`  
**Lane:** UX-4 Map · layers · hover · drawer · pending location CTAs  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy / migrate:** not performed (lane receipt only)

---

## Carmen plain language

**Mapa** keeps honest **7 / 2 / 5** geography: active portfolio read, **confirmed coordinates only** on the canvas, provenance-only links **never** become pins. **Capas** switch between Clientes and commercial record filters (oportunidades, cotizaciones, pedidos). **Ingresos** stays a **disabled** slot (`AUTHORITATIVE_REVENUE_LAYER=NO`).

Hover a confirmed pin to see the customer name. Click a pin or list row to open **vista rápida** — **drawer on desktop**, inline card on mobile. Customers **without coordinates** get a direct CTA to **Ubicaciones** in Cliente 360.

---

## Delivered

| Capability | Proof state |
|---|---|
| Layer switcher (clientes + commercial filters; future/manual disabled) | **IMPLEMENTED** |
| Ingresos layer slot disabled (no authoritative revenue) | **IMPLEMENTED** + **TESTED** |
| Pin hover label (confirmed coords only) | **IMPLEMENTED** |
| Click → quick view drawer (lg+) / compact card (mobile) | **IMPLEMENTED** |
| Pending location CTAs → `#ubicaciones` | **IMPLEMENTED** + **TESTED** |
| 7/2/5 honesty · no invented coordinates | **PRESERVED** |
| Hosted / browser verify | **UNPROVEN** this SHA (no deploy) |

---

## Files (this commit)

- `apps/os-web/components/map/map-experience.tsx` — drawer host wiring
- `apps/os-web/components/map/map-party-drawer.tsx` — ContextDrawer quick view
- `apps/os-web/components/map/map-live-canvas.tsx` — hover tooltip
- `apps/os-web/components/map/map-marker-tooltip.tsx`
- `apps/os-web/components/map/map-layer-controls.tsx` — revenue honesty pill
- `apps/os-web/components/map/map-quick-view-compact.tsx` — pending CTAs
- `apps/os-web/components/map/map-customer-lists.tsx` — list pending CTAs
- `apps/os-web/lib/map/layers.ts` — ingresos disabled registry entry
- `apps/os-web/lib/map/authoritative-revenue.ts`
- `apps/os-web/lib/map/pending-location.ts` (+ test)
- `apps/os-web/lib/map/index.ts`

---

## Honesty constraints honored

- Pins only from `listPartyLocations` confirmed lat/lng
- Provenance URLs never plotted; no geocode-on-map
- Commercial amounts labeled as oportunidad/cotizado/pedido — never Ingresos
- `AUTHORITATIVE_REVENUE_LAYER=NO` — ingresos capa disabled
- REAL_SEVEN_MUTATED = **NO**

---

## Tests run (local)

```text
pnpm --filter @isalwa/ts-utils build && pnpm --filter @isalwa/providers build
apps/os-web: pnpm exec tsx --test \
  lib/map/map-desk.test.ts \
  lib/map/commercial-lens.test.ts \
  lib/map/pending-location.test.ts
→ 16 pass / 0 fail
```

**HEAD_SHA:** `3981ebde40460d9962ea3efb21922e4fbdd09d3f`
