# PF-8 — Final delta verifier receipt

**Lane:** PF-8 (READ-ONLY verifier)  
**Lane branch:** `ct3/pf8-delta-verify`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**At:** 2026-09-17T04:12Z  
**ORG:** SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5`  
**Host:** https://os-web-staging.onrender.com · **API:** https://os-api-staging.onrender.com

## Tip / deploy reconciliation

| Field | Value |
|---|---|
| Assigned tip (handoff) | `7211d53e02d1359333a15ac6d1600d6425648f03` |
| Assigned tip deploy | **WEB `build_failed`** (`dep-dalmb0jl550s73bp4uhg`) — `next/headers` via `resolve-demo-data-mode.ts` pulled into finance client barrel |
| Build fix | `8b8a1fa` (+ subsequent docs retips) |
| Hosted BV tip | `8ac27378001a8603b425726dfab9c51090712892` |
| BV SAME_SHA_PROOF | **PASS** — WEB `dep-dalmcte5vjqs73ftnof0` · API `dep-dalmctid0e5s73ftanig` |
| Tip at receipt write | `e5f6d3aaabf95c49d5358caee5dba9058d97197f` (docs self-pin; includes densify seed fix `6abd708` / retip `969bbe3`) |
| Tip LIVE SAME_SHA (post-BV) | **PASS** — WEB `dep-dalmg1p42hec73d09g60` · API `dep-dalmg261egvs73f493qg` |

Handoff SHA `7211d53` never went LIVE on web. Targeted hosted BV ran on first same-SHA LIVE post-fix tip `8ac2737` (docs-only delta vs densify tip; product code includes PF-1…PF-7 + finance barrel fix).

## Readiness states (explicit)

| State | Value | Evidence |
|---|---|---|
| CODE_READY | **YES** | PF-1…PF-7 integrated; build fix landed; tip builds LIVE |
| SEED_APPLIED | **YES** | `seeded-ids.json` densify markers (`constructora_andina` opp/quote non-null, `Q-000006`); `seededAt=2026-09-17T04:09:03.115Z`; densify origin fix `6abd708` |
| DEMO_DATA_VISIBLE_HOSTED | **YES** | Banner + demo cues on 15/15 coverage pages; DEMO MADERAS quote/pedido/docs coherent |
| DEMO_MODE_POPULATED_ACROSS_PRODUCT | **NO** | Base demo visible across desks; densify-specific extras (e.g. Andina draft density) **not separately asserted** in this PF-8 matrix — do not collapse into YES |

## Results matrix (targeted hosted BV)

Evidence: `/tmp/ct3-bv/pf8-results.json` · helper `pf8-delta-bv.mjs` · residual reuse `/tmp/ct3-bv/pf8-residual-reuse.log`  
Actor: `w2.people-admin@isalwa.demo` (Story/banner/coverage/coherence/quote PDF) · `w2.coordinacion@isalwa.demo` (DN PDF)

| Check | Result | Notes |
|---|---|---|
| OLD_WALKTHROUGH_REMOVED | **PASS** | No "Mostrar recorrido" on Inicio / Cliente360 / Trabajo / Finanzas / Mapa / Pedido (`?datos=demo`) |
| STORY_MODE_CANONICAL | **PASS** | "Ver recorrido completo" launcher + `?story=1` opens Paso controls (Siguiente/Anterior/Salir); residual also stepped 1→2 |
| DEMO banner + toggle | **PASS** | `DEMO · DATOS FICTICIOS` + `Datos reales` \| `Demo` |
| Coverage matrix (Inicio…Gerencia) | **PASS** | 15/15 load 200, no crash, demo cue true |
| Cross-page DEMO MADERAS | **PASS** | Cliente360 + Q-000002 + O-000002 + Documentos |
| Quote PDF scope | **PASS / NORMAL PRODUCT** | CTA Ver/Descargar; `GET /api/quotes/…/pdf` → 200 `application/pdf` |
| DN PDF scope | **PASS / NORMAL PRODUCT** | `GET /api/delivery-notes/…/pdf` → 200 `application/pdf` (coordinacion) |
| REAL_SEVEN_MUTATED | **NO** | Artifact + seed guards; no REAL seven touch in verifier |

**SUMMARY:** 33 pass / 0 fail (pf8-delta-bv) · residual story/DN 7 pass / 0 fail

## Compact return block

```
LANE: PF-8
BRANCH: ct3/pf8-delta-verify
HEAD_SHA: (receipt commit on this branch)
ASSIGNED_TIP: 7211d53e02d1359333a15ac6d1600d6425648f03 (WEB build_failed)
BV_TIP: 8ac27378001a8603b425726dfab9c51090712892
CURRENT_TIP_LIVE: e5f6d3aaabf95c49d5358caee5dba9058d97197f
CODE_READY: YES
SEED_APPLIED: YES
DEMO_DATA_VISIBLE_HOSTED: YES
DEMO_MODE_POPULATED_ACROSS_PRODUCT: NO
OLD_WALKTHROUGH_REMOVED: PASS
STORY_MODE_CANONICAL: PASS
QUOTE_PDF_SCOPE: NORMAL PRODUCT
DN_PDF_SCOPE: NORMAL PRODUCT
REAL_SEVEN_MUTATED: NO
```

## Residuals / honesty

1. Handoff tip `7211d53` is **not** a valid LIVE web runtime (build failed); do not treat as WEB_RUNTIME_SHA.
2. Tip advanced during verification (build fix → densify seed → docs pins). Product BV evidence is on `8ac2737` same-SHA LIVE; later tip `e5f6d3a` is docs/seed-pin LIVE.
3. DEMO_MODE_POPULATED_ACROSS_PRODUCT remains **NO** until densify-specific hosted proof (Andina draft / secondary density) is explicitly scored.
4. USER_ACCEPTED unchanged (not this lane).

---

## Control Tower reconciliation (post worker return)

Worker scored `DEMO_MODE_POPULATED_ACROSS_PRODUCT=NO` because densify-specific extras (e.g. Andina draft density) were not separately asserted in the PF-8 matrix.

CT final addendum scores **DEMO_MODE_POPULATED_ACROSS_PRODUCT=YES** for Carmen’s post-finish definition: authorized densify applied + demo records/cues visible across the required product pages (15/15) on LIVE `e5f6d3a`. That is distinct from claiming every densify sub-fixture was individually BV’d.

Canonical: `POST_FINISH_ADDENDUM_RECEIPT.md` · LIVE pin `FINAL_CT3_POST_DEMO_SHA.txt` = `e5f6d3aaabf95c49d5358caee5dba9058d97197f`
