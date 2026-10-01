# Map blank fix — Control Tower receipt

**Date:** 2026-09-16T18:40Z  
**Lane:** MAP BLANK DEFECT CLOSE (SERIAL)  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Branch:** `pre-pilot/company-os-pass`

## Verdict

| Field | Value |
|-------|-------|
| **MAP_LIVE** | **YES** |
| **FINAL_RUNTIME_SHA** | `29b6f3f37fcf848a4a16248f34e39eeb33d1e463` |
| **WEB_SHA** | `29b6f3f37fcf848a4a16248f34e39eeb33d1e463` |
| **API_SHA** | `29b6f3f37fcf848a4a16248f34e39eeb33d1e463` |
| **WEB_API_SAME** | **YES** |

## Push

- `git push origin HEAD:pre-pilot/company-os-pass` → `3d2aa2c..29b6f3f`

## Deploys (exact SHA, `--wait --confirm`)

| Service | Service ID | Deploy ID | Status | Commit |
|---------|------------|-----------|--------|--------|
| os-web-staging | `srv-dajddb67bikc73bl42q0` | `dep-dale2enf3r2c738uj020` | live | `29b6f3f…` |
| os-api-staging | `srv-dajd64gae00c739gpk20` | `dep-dale2en40ujc73dmodpg` | live | `29b6f3f…` |

## Hosted BV (carmen.staging @ 1440)

- Login OK · welcome dismissed (“Explorar por mi cuenta”)
- `/mapa`: Mapbox Light style **200**, vector tiles **200**, auth failures **0**
- Canvas **non-porcelain**: roads/land/labels visible (Urubó, Norte, El Dorado, Río Piraí)
- Confirmed-client marker present on basemap
- Coverage honesty **2/7** (“Mapa activo: 2 de 7 tienen coordenadas”)

### Evidence paths

- Screenshot: `docs/operations/final-pre-pilot-2026-09-16/map-blank-diag/mapa-fixed-1440.png`
- Before (blank/modal): `docs/operations/final-pre-pilot-2026-09-16/map-blank-diag/mapa-blank-carmen-1440.png`
- Network/DOM BV JSON: `docs/operations/final-pre-pilot-2026-09-16/map-blank-diag/mapa-fixed-bv.json`
- This receipt: `docs/operations/final-pre-pilot-2026-09-16/map-blank-diag/map-blank-fix-receipt.md`

## Fix commit (already local; not redone)

`29b6f3f37fcf848a4a16248f34e39eeb33d1e463` — `fix(map): stop porcelain-painting Mapbox basemap blank`

## Out of scope (preserved)

- No Almacén dirty-doc edits beyond this lane’s evidence
- No Wave C
- Navy/teal visual elsewhere untouched

**STOP.**
