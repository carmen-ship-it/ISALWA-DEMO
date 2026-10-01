# Map blank — Control Tower defect intake (Carmen screenshot)

**Date:** 2026-09-16T18:35Z  
**Evidence:** Carmen hosted screenshot `/mapa` as Carmen — blank beige map rectangle, footer “2 de 7 clientes con coordenadas confirmadas”, pill “Mapbox Light”, cartera lists 2 plottable.

## Claim update

| Field | Value |
|-------|-------|
| **MAP_LIVE (current hosted until fix BV)** | **NO / FAIL** |
| Prior “LIVE” from agent `23323f44` | **SUPERSEDED by Carmen hosted visual** (higher evidence) |

## Diagnosis

1. Env still present: `NEXT_PUBLIC_MAPBOX_TOKEN` pk-shaped · `NEXT_PUBLIC_MAPS_PROVIDER=mapbox`.  
2. Playwright network: Mapbox style/tiles **200** — provider connected.  
3. Root cause (code): `MapLiveCanvas` `onLoad` painted Mapbox `background-color` to porcelain `#f3f1ed` (and water `#d9e4df`) → basemap reads as blank beige canvas even when tiles succeed.  
4. Secondary: welcome modal “Bienvenido a ISALWA” can cover `/mapa` until dismissed.

## Fix (local commit — deploy pending)

`29b6f3f37fcf848a4a16248f34e39eeb33d1e463` `fix(map): stop porcelain-painting Mapbox basemap blank`

## Handoff rule

Do **not** publish Map LIVE to Isa/Álvaro until post-deploy hosted BV PASS with visible basemap (not porcelain blank).

**STOP intake.**
