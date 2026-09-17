# CT3_FINAL_RECEIPT

**Canonical folder:** `docs/operations/ct3-owner-demo-completeness-2026-09-17/`  
**Branch / ORIGIN_BRANCH:** `ct3/owner-demo-completeness`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**At:** 2026-09-17T03:21Z  
**Authority:** Engineering status only. USER_ACCEPTED = NO.

## Opening table

| Field | Value |
|---|---|
| CT3_FINISHED | **YES** |
| FINAL_CT3_SOURCE_SHA | `f2740d12b405807c5f7b7c9602b91dcf59331a3b` |
| ORIGIN_BRANCH | `ct3/owner-demo-completeness` (pushed; tip may include later docs pins) |
| WEB_RUNTIME_SHA | `f2740d12b405807c5f7b7c9602b91dcf59331a3b` |
| API_RUNTIME_SHA | `f2740d12b405807c5f7b7c9602b91dcf59331a3b` |
| SAME_SHA_PROOF | **PASS** (redeploy targeted; confirm LIVE) |
| WEB_DEPLOY_ID | `dep-dallrfbl550s73bnic10` |
| API_DEPLOY_ID | `dep-dallrfijnfac73a11h60` |
| REAL_SEVEN_MUTATED | **NO** |
| QUOTE_PDF_OWNER_DEMO_READY | **YES** (actor `w2.asesor`; CTA + HTTP 200 PDF) |
| DELIVERY_NOTE_PDF_OWNER_DEMO_READY | **YES** (actor `w2.coordinacion` / `delivery.record`; HTTP 200 `application/pdf`) |
| CONVERSATION_DEMO_READY | **YES** |
| FULL_STORY_DEMO_READY | **YES** (actor `w2.people-admin`; Paso 1→2, Siguiente/Anterior/Salir) |
| CLIENTE360_REAL_TABS_BV | **PASS** |
| COMPROMISOS_ROUTE_BV | **PASS** |
| MAP_BV | **PASS** (no Revenue; Clientes/Oportunidades/Valor labels) |
| MANAGEMENT_BV | **PASS** (`/inicio?lente=gerencia`) |
| PEDIDO_OPS_BV | **PASS** (O-000002 known-state / next step) |
| COLOR_SPEC_CONFORMANCE | **PASS with documented token deviations** — see `CT3_COLOR_RECEIPT.md` |
| MOBILE_BV | **PASS** (~390px; no horizontal body overflow on Cliente360 + Conversaciones) |
| AI_OWNER_REVIEW_READY | **NO** (provider/hosted interactive AI not proven; UI must not pretend live) |

## Demo refs (SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5`)

| Client | partyId | Notes |
|---|---|---|
| DEMO MADERAS ORIENTE | `01M2PM95PV7YP6AECYXSX4GRBW` | Full loop (quote `01M2PM9KSJXN1K4CF45FT0H299` / Q-000002, order `01M2PMA280KX4AAV7049YKNE07` / O-000002, DN `01M2PMCSNXH644P1C4F832BGKQ`) |
| DEMO CONSTRUCTORA ANDINA | `01M2PMDY71EDWHJG3AFK36TDZ2` | New sales conversation → possible Opportunity |
| DEMO PROYECTOS DEL SUR | `01M2PME87FZGJT8R22KPX921Z2` | Quote acceptance conversation (Q-DEMO-001) |
| DEMO HOTEL CENTRAL | `01M2PMF0V0VHHYH19KBXH629E8` | Delivery-status certainty conversation |
| DEMO FERRETERÍA NORTE | `01M2PMFXKD9VTWB21SQX0VEDJY` | Problem → possible Issue |

Seed artifact: `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json` · web IDs: `apps/os-web/lib/demo/seeded-ids.json` · `seededAt=2026-09-17T02:53:12.658Z`

## Lane integration

| Lane | Integrated | Evidence |
|---|---|---|
| A Cliente360 tabs + Compromisos | YES | Hosted tabs + `/compromisos` |
| B Quote PDF / commercial | YES | Quote PDF 200 |
| C Conversaciones | YES | 5 DEMO threads + context |
| D Certainty / smart-context | YES | Wired into Contexto ISALWA |
| E Owner demo seed + Story Mode | YES | Seed + Story Mode BV |
| F Pedido / ops | YES | Salvaged + Pedido BV |
| G Map / management | YES | Salvaged + map/mgmt BV |
| H AI adapters | YES | Source; AI hosted **UNPROVEN** |

## Critical fix on FINAL SHA

Cliente360 SSR crash (`digest 25943647`) — `ScaledListReveal` render-prop crossed RSC boundary. Fixed in FINAL SHA by preview/full React nodes.

## Residuals (non-blocking for CT3_FINISHED)

1. **AI_OWNER_REVIEW_READY = NO** — do not present AI as live without hosted proof.
2. **DN PDF scope** — requires `delivery.record` (coordinacion), not asesor commercial scopes. By design; owner-demo PDF path proven with authorized role.
3. **Story Mode gate** — `canUseOwnerDemo` = role-preview (people.admin / system+management). Proven with `w2.people-admin`.
4. **Audit conversation-origin labels** — implemented + unit-tested; hosted sample events depend on create-from-conversation actions (seed may not emit all four Spanish strings).
5. **USER_ACCEPTED = NO** — Carmen/product authority.

## Artifact index

- `CT3_FINAL_RECEIPT.md` (this file)
- `CT3_HOSTED_BV.md`
- `CT3_DEMO_DATA_RECEIPT.md`
- `CT3_VISUAL_ACCEPTANCE.md`
- `CT3_COLOR_RECEIPT.md`
- `CT3_COPY_RECEIPT.md`
- `CT3_DEVIATIONS.md`
- `FINAL_CT3_SOURCE_SHA.txt`
- BV helpers: `ct3-residual-bv.mjs`; results `/tmp/ct3-bv/results-asesor.json`, `/tmp/ct3-bv/results-residual.json`

## CARMEN HANDOFF — WHAT I NEED TO KNOW

1. CT3 engineering finish is **YES**. Runtime FINAL advanced to `f2740d1…` after integrating late F/G lane tips (tests + G polish) on top of the prior hosted BV SHA `bd8b070…`.
2. Review Story Mode as **people-admin** (or any role-preview account): `/inicio?datos=demo&story=1`.
3. Quote PDF as **asesor**; Delivery Note PDF as **coordinacion**.
4. Confirm whether AI should stay hidden/disabled until provider proof (recommended: yes).
5. USER_ACCEPTED remains **NO** until you sign visual/product acceptance.

## Post-finish lane tip integration

Cherry-picked from [Finish salvage CT3-F ops](cfe37b63-b3e8-462c-b9bc-7d4870467906) (`8985e3e` tests) and [Finish salvage CT3-G map](2d6e4b93-d38d-4426-af2d-f6333b65bc6a) (`1e43541` funnel/bands/tests). Redeploy: web `dep-dallrfbl550s73bnic10`, API `dep-dallrfijnfac73a11h60`. Prior poll timeout on an earlier mid-pass deploy is obsolete.

