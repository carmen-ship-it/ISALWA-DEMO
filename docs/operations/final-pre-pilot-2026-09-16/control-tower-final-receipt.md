# FINAL PRE-PILOT — Control Tower Carmen handoff receipt

> **SUPERSEDED for current-state claims.** Point-in-time midday receipt.  
> **Current truth:** LIVE `e9a7a02` · MAP LIVE (ancestral `29b6f3f`) · `SAFE_FOR_ISA_ALVARO_OWNER_REVIEW = YES` → `docs/handoff/ISALWA_FINAL_PRELAUNCH_SOURCE_FOR_EDITOR.md`

**Date:** 2026-09-16T16:10:00Z  
**Role:** Control Tower (READ-ONLY — no deploys, no grants, no Wave C)  
**Worktree:** `.worktrees/wave2-remediation-integrate`  
**Branch tip (matches live at write time):** `23e50b0d7723040898f1c21ec06f014171ca8e24`  
**USER-ACCEPT:** not claimed · **HISTORICAL STOP**

## Live runtime proof (Render REST)

| Service | ID | Deploy | Status | SHA |
|---------|----|--------|--------|-----|
| WEB `os-web-staging` | `srv-dajddb67bikc73bl42q0` | `dep-dalbkkrm8hqs7390b0l0` | live | `23e50b0d7723040898f1c21ec06f014171ca8e24` |
| API `os-api-staging` | `srv-dajd64gae00c739gpk20` | `dep-dalbm6v40ujc73dei7o0` | live | `23e50b0d7723040898f1c21ec06f014171ca8e24` |

**Expected tip match:** YES  
**WEB/API SAME:** YES  
**FINAL RUNTIME SHA:** `23e50b0d7723040898f1c21ec06f014171ca8e24`  
(`fix(qa): stop Ver Como start 500 when live access errors`)

Ancestors included (product): `c23a262` navy/teal · `72a2f94`+`f0d8757` Ver Como memberIds · `04ace54` Gerente Inicio · `5ed448c` Compras stacked-deny · `37a1ed7` AI Nest DI.

## Ingested receipts (do not restart)

| Lane | Agent | Verdict on tip / evidence |
|------|-------|---------------------------|
| Ver Como Salir | `fc2e2c1e` | **PASS** banner + Salir on `23e50b0` (web+API MATCH) |
| Ver Como 500 fix | `063e0fe4` | **PASS** start POST 303 + banner; Salir later closed by `fc2e2c1e` |
| Visual navy/teal | `c23a262` + Playwright `5be66ddb` | **PASS** interactive lean (navy titles / teal kickers / collapse 280→72 / 390 drawer) |
| Visual SSR | `0b2fc6f9` | **STILL TOO PORCELAIN** on SSR HTML — **prefer Playwright** for brand impression |
| Visual residual | — | Canvas remains porcelain by constitution; rail structure navy/teal-led in interactive BV. No open visual defect blocking pre-pilot. |
| A/B Inicio/Compras | ancestors `04ace54` / `5ed448c` | Fixed earlier; both in live tip tree |
| Product intelligence | `73364620` / `1c71b8b1` | **PASS** (queues/lenses, What Changed gating, fail-closed admin/sistema, QA 404, no REAL leak). Cmd+K interactive keypress UNPROVEN — not scored as defect. |
| Map/AI providers | `7a169e9e` + Architect Vercel `a4738233` | **EXTERNAL_CREDENTIAL_GATE** after exhaust; `carmen-ship-it` / `isalwa-architect` **retired** |
| People Admin SYNTH | catalog design | **INTENTIONAL GAP** — no SYNTH `people.admin` persona; do not invent |

## Carmen checklist (exact fields)

| Field | Value |
|-------|--------|
| **QA ACCESS GRANT** | **PASS** (Carmen operator grant outside agents; prior Verifier C DB proof) |
| **QA ACCESS ACTIVE** | **YES** |
| **QA CONTROL HOSTED** | **PASS** (`/sistema/pruebas-acceso`, `qa.access` pill) |
| **PERMISSION MATRIX** | **PASS** (live effective-access after memberId staging resolve; `5be66ddb` / post-fix writers) |
| **VER COMO** | **PASS** (start 303 + MODO DE PRUEBA Asesor banner + Salir restores Carmen — `063e0fe4` + `fc2e2c1e` on `23e50b0`) |
| **QA SYNTH-ONLY** | **PASS** |
| **REAL TARGET** | **DENIED** |
| **NON-QA ACTOR** | **DENIED** |
| **QA PRODUCTION** | **DISABLED** (staging profile gate) |
| **1440** | **PASS** (Playwright navy/teal lean + prior Inicio/Compras fixes in tip) |
| **390** | **PASS** (Playwright drawer + Gerente Inicio ancestor fix) |
| **PRODUCT INTELLIGENCE HOSTED** | **PASS** |
| **MAP** | **EXTERNAL_CREDENTIAL_GATE** — Mapbox `pk.` absent on `os-web-staging`; basemap UNPROVEN |
| **AI** | **EXTERNAL_CREDENTIAL_GATE** — `OPENAI_ISALWA_API_KEY` / `AI_ENABLED` absent on `os-api-staging`; live model UNPROVEN (`AI_UNAVAILABLE`) |
| **CURRENT WEB SHA** | `23e50b0d7723040898f1c21ec06f014171ca8e24` |
| **CURRENT API SHA** | `23e50b0d7723040898f1c21ec06f014171ca8e24` |
| **FINAL RUNTIME SHA** | `23e50b0d7723040898f1c21ec06f014171ca8e24` |
| **WEB/API SAME** | **YES** |
| **HOSTED INDEPENDENT ACCEPTANCE** | **CONDITIONAL** (Map + AI provider-gated; QA / visual / intelligence closed) |
| **SAFE FOR CARMEN** | **CONDITIONAL** — safe for Carmen internal staging walkthrough of QA/Ver Como/intelligence/desks; **not** for claiming Map or live AI |
| **SAFE FOR ISA/ÁLVARO** | **NO** — do not create Isa/Álvaro accounts; Map/AI still EXTERNAL; no USER-ACCEPT |
| **EXACT NEXT ACTION (ONE)** | Provision company Mapbox public `pk.` on `os-web-staging` (`NEXT_PUBLIC_MAPS_PROVIDER=mapbox` + `NEXT_PUBLIC_MAPBOX_TOKEN`) **and** dedicated `OPENAI_ISALWA_API_KEY` (+ `AI_ENABLED=true`, allowlisted `AI_MODEL`) on `os-api-staging`, then redeploy web+API same SHA and re-BV `/mapa` + AI assist — Architect Vercel cannot supply either. |

## MAP / AI — Vercel discovery fields

| Field | Result |
|-------|--------|
| **ARCHITECT VERCEL PROJECT** | Account/team **carmen-ship-it** / **carmen-ship-its-projects**. Historical **`isalwa-architect`** — **RETIRED/ABSENT** (MCP empty / `get_project` 404 / site 403). No migrate. |
| **VERCEL MAPBOX ENV** | **ABSENT** (no live project) |
| **VERCEL MAPBOX TOKEN USABLE** | **NO** |
| **VERCEL OPENAI ENV** | **ABSENT on Vercel**; local Architect Gemini-only (`ARCHITECT_LLM_API_KEY`) — **must not reuse** (`AI_PILOT_BOUNDARY`) |
| **VERCEL OPENAI KEY USABLE** | **NO** |
| **MAP FINAL STATE** | **EXTERNAL_CREDENTIAL_GATE** |
| **AI FINAL STATE** | **EXTERNAL_CREDENTIAL_GATE** |

## Honesty / states

- Subfeatures scored separately. Do **not** collapse to whole-feature PASS.
- Map interactive + live AI model remain **UNPROVEN** / provider-blocked.
- Visual brand: interactive Playwright **overrides** SSR “STILL TOO PORCELAIN” for acceptance impression; porcelain canvas residual is by design.
- People Admin SYNTH persona absence = **intentional gap**, not a Ver Como FAIL.
- **Wave C:** not started. **USER-ACCEPT:** not claimed.

**STOP.**
