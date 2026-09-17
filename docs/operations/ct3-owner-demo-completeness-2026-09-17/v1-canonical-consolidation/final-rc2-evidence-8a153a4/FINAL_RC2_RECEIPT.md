# FINAL RC2 RECEIPT — CT3 owner-eval

**As of:** 2026-09-17T15:05Z (approx)  
**Authorized tip:** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**RC2 code tip (pre-evidence):** `8a153a4db43fd82e29d6db6173b668236e763b3f` family / deploy commit `8f1ac76…`  
**Freeze:** CODE_FROZEN_FOR_BV — no app code patches during this BV window  
**AI:** NO · **REAL staff logins:** NO · **REAL_SEVEN_MUTATED:** NO

## Deploy

| Service | Status | Commit |
|---|---|---|
| os-web-staging (`srv-dajddb67bikc73bl42q0`) | LIVE (authorized RC2 deploy) | `8f1ac76…` |
| os-api-staging (`srv-dajd64gae00c739gpk20`) | LIVE (authorized RC2 deploy) | `8f1ac76…` |

Deploy lane: **DONE**. Not stuck.

## Hosted BV status

| Lane | Status | Evidence |
|---|---|---|
| Playwright pack (first pass) | **PARTIAL** — ~83 PASS then harness crashes | `/tmp/ct3-bv/rc2-hosted-bv-results.json` |
| Playwright resume | **PARTIAL** — coverage typeahead timeout; commercial strict-mode duplicate link | resume log |
| Playwright finish | **BLOCKED** — Chrome `SIGABRT` / sandbox kill after prior run | agent shell |
| MCP browser lock | **BLOCKED** — auto-review refused lock | — |
| MCP unlocked navigate | **USED** — continued remaining probes | browser tab `138540` |

**BLOCKED LANE:** automated Playwright re-launch  
**BLOCKER TYPE:** SECURITY_GATE / agent runtime (Chrome abort under sandbox)  
**SAFE WORK COMPLETED:** deploy proof; View As desks; Inicio consistency; Resumen metrics; quote surfaces; coverage UI; commercial create form  
**UNBLOCK REQUIREMENT:** unsandboxed Playwright (or approved browser_lock) to finish grant/revoke + full commercial mutate + security negatives + mobile shots

## Gate rollup (honest)

| Gate | Result |
|---|---|
| FULL_COMMERCIAL_LOOP_HOSTED | **PARTIAL** — created opp `01M2QYAP…` + quote **Q-000007**; send/PDF blocked until lines; seeded Q-000002 PDF/envío PASS |
| FULL_POST_SALE_LOOP_HOSTED | **FAIL** — owner **Mi vista** gets API `forbidden` → AccessDenied on Maderas pedido `01M2PMA280…` |
| TEMPORARY_COVERAGE_HOSTED | **PARTIAL** — UI + canonical-owner warning PASS; grant/revoke mutation UNPROVEN |
| REASSIGNMENT_HOSTED | **PARTIAL** — UI only; permanent owner change skipped on shared DEMO |
| VIEW_AS_INICIO / APROBACIONES / COMPROMISOS / INCIDENCIAS | **PASS** (earlier harness) |
| INICIO_WORK_APPROVAL_CONSISTENCY | **PASS** (earlier harness) |
| CLIENTE360_GRAPH_COHERENT | **PARTIAL** — Resumen Opp=1 Quote=1; **Pedidos=0** while order id exists but detail forbidden |
| SEARCH_AUTH_HOSTED | **UNPROVEN** this session (prior harness had owner search PASS before crash) |
| HOSTED_TENANT / RESOURCE NEGATIVES | **UNPROVEN** |
| MOBILE_VISUAL | **UNPROVEN** |
| DESKTOP_VISUAL | **PARTIAL** |

## Material hosted findings (do not paper over)

1. **Pedido AccessDenied for Carmen owner** on `/clientes/…/pedidos/01M2PMA280KX4AAV7049YKNE07` — `OsApiError.forbidden` path. Earlier harness `pedido_maderas PASS` was a **false positive** (matched breadcrumb “Pedido”).
2. **Resumen Pedidos=0** while seeded order id is known — coherent with forbidden list/detail, not with “graph healthy.”
3. Coverage typeahead option click flaky in Playwright; UI present with “no cambia el responsable / no autoriza convertir” copy.

## Verdict facts

| Fact | Value |
|---|---|
| DEPLOY_LIVE_ON_AUTHORIZED_TIP | **YES** |
| HOSTED_BV_COMPLETE | **NO** |
| FULL_BUSINESS_LOOP_CLOSED | **NO** |
| SAFE_TO_BEGIN_CARMEN_PRODUCT_ACCEPTANCE | **NO** |
| SAFE_TO_INVITE_ISA_ALVARO | **NO** |
| USER_ACCEPTED | **NO** |
| AI_OWNER_REVIEW_READY | **NO** |
| REAL_SEVEN_MUTATED | **NO** |

## Next (when BV tools unblocked)

1. Clear View As; re-prove pedido under owner vs Producción/Almacén View As.  
2. Finish coverage grant→revoke + cannot-convert copy.  
3. Complete commercial create opp→quote→PDF→register sent.  
4. Security negatives + mobile screenshots.  
5. Recompute HOSTED_PROVEN only after those YES.

Raw checks: `/tmp/ct3-bv/rc2-hosted-bv-results.json`  
Screens: `/tmp/ct3-bv/rc2-screens/`
