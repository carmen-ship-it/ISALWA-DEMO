# CT3 POST-FINISH OWNER-DEMO — FINAL ADDENDUM RECEIPT

**At:** 2026-09-17T04:16Z  
**Authority:** Engineering status only. USER_ACCEPTED = NO.  
**Base CT3 finish:** `f2740d12b405807c5f7b7c9602b91dcf59331a3b` (unchanged; this is a bounded delta).  
**Does not restart CT3.** Full re-BV of A–H not repeated.

---

## Opening table (post-finish)

| Field | Value |
|---|---|
| FINAL_CT3_POST_DEMO_SHA | `e5f6d3aaabf95c49d5358caee5dba9058d97197f` |
| ORIGIN_BRANCH | `ct3/owner-demo-completeness` (pushed) |
| WEB_RUNTIME_SHA | `e5f6d3aaabf95c49d5358caee5dba9058d97197f` |
| API_RUNTIME_SHA | `e5f6d3aaabf95c49d5358caee5dba9058d97197f` |
| SAME_SHA_PROOF | **PASS** |
| WEB_DEPLOY_ID | `dep-dalmg1p42hec73d09g60` |
| API_DEPLOY_ID | `dep-dalmg261egvs73f493qg` |
| HOST | https://os-web-staging.onrender.com |
| API | https://os-api-staging.onrender.com |
| REAL_SEVEN_MUTATED | **NO** |
| SYNTH_ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| CODE_READY | **YES** |
| SEED_APPLIED | **YES** (authorized densify `2026-09-17T04:09:03Z`) |
| DEMO_DATA_VISIBLE_HOSTED | **YES** (PF-8: 15/15 pages with demo cue) |
| DEMO_MODE_POPULATED_ACROSS_PRODUCT | **YES** (page-visibility after densify; see workers/pf8-receipt.md CT reconciliation) |
| PF-8_BV | **PASS** 33/33 (`pf8-results.json`) |
| USER_ACCEPTED | **NO** |

---

## Integration chain (PF-1…PF-8)

| Lane | Status | Note |
|---|---|---|
| PF-1 commercial+fixture | IN_TIP | densify seed; origin fix `customer_reported` |
| PF-2 operations | IN_TIP | desk demo filters |
| PF-3 conversations | IN_TIP | demo context / provenance |
| PF-4 PDF | IN_TIP | normal product PDF routes proven hosted |
| PF-5 map/mgmt | IN_TIP | coverage in PF-8 |
| PF-6 walkthrough/story | IN_TIP | GuidePanel retired; Story Mode only |
| PF-7 audit/coherence | IN_TIP | |
| PF-8 verifier | **DONE** | hosted targeted BV PASS |

---

## Deploy / seed / proof sequence

1. Build break fixed: `next/headers` via finance barrel (`8b8a1fa` lineage).
2. First LIVE attempt after fix: web+API at tip including densify IDs.
3. Authorized densify seed: TCP OK to staging Postgres; first run failed `os_commitments_origin_chk` (`customer_said`); fixed → `customer_reported`; re-apply **PASS**.
4. Redeploy tip `e5f6d3a` web+API **LIVE** same SHA.
5. PF-8 hosted browser: **33 pass / 0 fail**.

Seed command: `STAGING_FIXTURE_CONFIRM=1 ./scripts/ct3-owner-demo-seed-authorized.sh`  
Receipt: `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json` · `REAL_SEVEN_MUTATED=NO` · clients=5

---

## PF-8 proof highlights

- Old walkthrough removed (`Mostrar recorrido` absent on sampled pages)
- Story Mode open (Paso / Siguiente / Anterior / Salir)
- Demo banner + toggle
- Demo cue on all 15 coverage routes
- Cross-page DEMO MADERAS coherence (Cliente360 / quote / pedido / documentos)
- Quote PDF HTTP 200 `application/pdf` (asesor)
- DN PDF HTTP 200 `application/pdf` (coordinacion)

Evidence: `docs/operations/ct3-owner-demo-completeness-2026-09-17/pf8-results.json` · `/tmp/ct3-bv/pf8-results.json`

---

## CARMEN HANDOFF — WHAT I NEED TO KNOW

1. **Post-finish delta is engineering-complete** on FINAL `e5f6d3aaabf95c49d5358caee5dba9058d97197f` with web+API same-SHA LIVE and densify seed applied to SYNTH.
2. **Demo mode is populated across the product** on hosted staging (`?datos=demo` / Demo toggle) — not sparse prior seed alone.
3. Review as **people-admin**: Story Mode + demo banner; as **asesor**: Quote PDF; as **coordinacion**: DN PDF.
4. **REAL_SEVEN_MUTATED = NO**.
5. **USER_ACCEPTED = NO** until you sign product acceptance. AI remains **UNPROVEN** / not owner-review-ready.
6. Prior CT3 finish SHA `f2740d1` remains the CT3_FINISHED base; this receipt is the **post-finish addendum** only.
