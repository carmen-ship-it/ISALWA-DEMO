# Map and geography boundary — ISALWA OS

**Status:** DOCUMENTED. No live map in `apps/os-web`. No coordinates invented here.  
**Date:** 2026-09-14  
**Lane:** I (map / geo boundary only)

This document does not authorize a map library, a geocoder, a tile token, or a correction of real customer locations.

---

## What exists

| Surface | Evidence | OS status |
|---------|----------|-----------|
| Map port | `packages/providers/src/maps` — `createMapProvider()`, `MapboxMapProvider`, `MockMapProvider` | Port exists. Provider-neutral `MapViewConfig`. UI must not import `mapbox-gl`. |
| Legacy Territorio UI | `docs/product/MISSION16_TERRITORY_FOUNDATION.md` — `apps/web/src/components/territorio/*` | Demo product. Not the OS shell. |
| OS web | `apps/os-web` has no `mapbox-gl` dependency and does not call `createMapProvider()` | **No live map.** Do not add `mapbox-gl` to close that gap in this lane. |
| Canonical location | `docs/architecture/LOCATION_CANONICAL_SLICE_IMPLEMENTATION_EVIDENCE.md` | `os_locations`. Coordinates optional. `provenanceUrl` is intake provenance, not geography. Plot only rows that already have non-null coordinates. Do not geocode short URLs. |
| Territory | `docs/architecture/ARCHITECT_TO_OS_TRACEABILITY.md` RD-04 / A-07 | `OsTerritory` is a stub. Capability `territory` is FUTURE. No assignment. No os-web map. **MISSING / BUSINESS DECISION REQUIRED.** Traceability also says: do not show a map to Isa/Álvaro until that decision exists. |

---

## Pilot coverage (do not invent points)

Authorized customer-only import of the pilot workbook set (not the complete ISALWA customer population):

| Fact | Count |
|------|------:|
| Real imported customers | 7 |
| Locations with coordinates already stored | 2 |
| Provenance URL only (no coordinates) | 5 |

Short `maps.app.goo.gl` links stay provenance-only. Offline parsing in `packages/os-import/src/parse-maps-url.ts` does not call a geocoder and does not expand short links.

**Coverage copy to use later** (counts only — not a heatmap, not a territory fill):

> 2 de 7 clientes con ubicación disponible en mapa

The helper that produces that sentence is `apps/os-web/lib/geo/coverage.ts`. It returns `{ plottable, unplotted, label }`. It does not accept or return latitude or longitude.

### Shared Maps URL — REAL-DATA CONFIRMATION NEEDED

**MICRISTAL** and **TORREZ** share one Maps URL.

Do **not** correct it. Do **not** split it. Do **not** copy coordinates from one customer onto the other. Do **not** drop either customer. Confirmation belongs to Isa/Álvaro (or whoever owns the workbook), not to a parser.

Until that confirmation, treat the shared URL as a flag (`sharedProvenanceUrlNeedsConfirmation`), not as a data mutation.

This lane did not re-query staging and does not record the URL or any coordinate.

Architecture notes written before that import (`LOCATION_CANONICAL_SLICE_IMPLEMENTATION_EVIDENCE.md`, `ISA_ALVARO_DEMO_AND_REAL_DATA_READINESS.md`) still say real XLS import was deferred. Those files are not rewritten here. The counts above are the operator record of the authorized staging import, not a fresh database proof from this lane.

---

## No fake heatmap. No invented territory boundaries.

Searched `docs/product/MISSION16_TERRITORY_FOUNDATION.md` and architecture notes for boundary evidence.

**Mission 16** (`docs/product/MISSION16_TERRITORY_FOUNDATION.md`):

- Status: visual and interaction foundation only, on the **legacy** web app.
- **Explicitly out of scope:** routing optimization, logistics, dispatch, **heatmaps**, **coverage layers**.
- Markers, filters, and clustering are presentation. `enabledLayers` is always empty.
- Extension hooks (`routes`, `coverage`, `silent`, `collections-density`, `workload`, `travel`) are reserved and not implemented.
- Next missions (coverage heat, silent territories, collections density) are **not this mission**.

**Architecture:**

- `ARCHITECT_TO_OS_TRACEABILITY.md`: territorio map + coverage is **MISSING (OS) / DEFERRED**. RD-04 / A-07: no assignment, no os-web map.
- `COMMERCIAL_IMPLEMENTATION_READINESS.md`: territory **names, hierarchy, and reassignment rules cannot be invented**. Entity existence is not a polygon.
- `LOCATION_CANONICAL_SLICE_IMPLEMENTATION_EVIDENCE.md`: territory assignment is **not in scope**. PostGIS is **not in scope**.
- `ENGINEERING_MASTER_PLAN.md` mentions an optional territory `geom` (MultiPolygon). That is a design sketch, not evidence that ISALWA has stored boundaries.

**Conclusion:** do not draw territory polygons, coverage fills, or heatmaps. No Architect or OS evidence of real ISALWA territory boundaries was found. A future map may plot the two customers that already have coordinates, and must say the other five are not plotted.

`docs/product/DEMO_JOURNEY.md` describes a “Territorio heatmap” as a desired feeling in the demo journey. That sentence is not a license to fabricate density.

---

## Provider: Mapbox or mock. Neutral.

Factory: `createMapProvider()` in `packages/providers/src/maps/index.ts`.

| Engine | When | Tiles | Token |
|--------|------|-------|-------|
| **mock** (default) | `provider` omitted, not `mapbox`, or `mapbox` without a token | MapLibre + Carto Positron style URL. No Mapbox account. | None. Missing token **falls back to mock**. It must not crash the OS. |
| **mapbox** | `provider=mapbox` **and** a non-empty public token | Mapbox Light (`mapbox://styles/mapbox/light-v11`) | Public token required for live tiles (`NEXT_PUBLIC_MAPBOX_TOKEN` in Mission 16). A secret/server token is not a substitute for the browser tile token. |

Do not add `mapbox-gl` to `apps/os-web` in order to “turn the map on.” The existing contract is `MapViewConfig`. Any future OS map must consume that contract (or a successor that stays provider-neutral) and must plot only stored coordinates.

### Cost — confirm with the provider

Repo bands are **not invoices**:

- Architect planificación (`apps/architect/lib/planificacion/content.ts`): Mapbox “plan gratuito inicial”, alternative MapLibre, band **USD 0–50 / month depending on use**.
- `docs/architecture/PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md` cost table does **not** include a map line (WhatsApp and AI excluded from that table; maps are not itemized).

**Flag:** live Mapbox tile price **requires provider confirmation** before a public token is issued. Mock / MapLibre has no Mapbox bill, but the Carto style URL is still a third-party basemap — confirm license if it is ever shown to customers. Google is not the system of record for coordinates (`PRODUCTION_PROVIDER_ARCHITECTURE_REVIEW.md`: OS-captured coordinates are authoritative; the map vendor is a lens). Do not call a geocoder to fill the five provenance-only rows.

---

## Language that must not leak onto a map

- **WhatsApp is not revenue truth.** Message volume, reply speed, or an inbox are not income, and must not color a map as sales.
- Quote totals are **Valor cotizado**. Order totals are **Valor de pedidos**. Never label either **Ingresos**.
- A pin is a stored coordinate, not proof of a visit, a delivery, or a territory.
