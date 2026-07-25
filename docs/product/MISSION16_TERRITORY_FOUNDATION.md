# Mission 16 — Territory Intelligence Foundation

**Status:** Implemented (visual + interaction foundation only)  
**Parent:** `docs/product/MISSION15_COMMERCIAL_PLATFORM.md` §5 Territory Intelligence  
**Explicitly out of scope:** routing optimization, logistics, dispatch, heatmaps, coverage layers

---

## What shipped

| Item | Detail |
|------|--------|
| **MapProvider architecture** | `packages/providers/src/maps/` — `MapProvider`, `MapboxMapProvider`, `MockMapProvider`, `createMapProvider()` |
| **Vendor decoupling** | React Territorio UI consumes `MapViewConfig` only — never imports Mapbox/MapLibre except inside the lazy GL adapter |
| **Default engine** | Mock → MapLibre + Carto Positron (calm vector basemap, no token required) |
| **Live engine** | `NEXT_PUBLIC_MAPS_PROVIDER=mapbox` + `NEXT_PUBLIC_MAPBOX_TOKEN` → Mapbox Light |
| **Markers** | Health: healthy / attention / risk / critical · size by VIP/importance |
| **Interactions** | Hover preview · click drawer · double-click zoom · cluster expand · flyTo · Esc closes drawer |
| **Filters** | URL `?filter=` aligned with Radar vocabulary (VIP, alto riesgo, cobranza, sin visita, seg.) |
| **Performance** | `next/dynamic` ssr:false · GeoJSON clustering · page shell paints before GL loads |
| **Extension points** | `lib/territorio/extensions.ts` reserves routes/coverage/silent/collections/workload/travel |

---

## Files

- `packages/providers/src/maps/*`
- `apps/web/src/components/territorio/*`
- `apps/web/src/components/territory-map.tsx` (re-export; preserves tour selector)
- `apps/web/src/lib/territorio/*`
- `apps/api/src/territorio/territorio.controller.ts` (extra presentation fields only)
- `.env.example` (Mapbox token notes)

---

## Env

```bash
NEXT_PUBLIC_MAPS_PROVIDER=mock   # or mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.…    # required for mapbox engine
```

---

## Verification

- [x] No iframe / raster screenshot map
- [x] Seeded lat/lng (no invented cities)
- [x] Porcelain / kiln / glaze marker language
- [x] prefers-reduced-motion → fly duration 0
- [x] No routing / logistics / dispatch
- [x] Web typecheck clean

---

## Next missions (not this one)

Visit routes · coverage heat · silent territories · collections density · advisor workload · travel suggestions — use reserved extension hooks.
