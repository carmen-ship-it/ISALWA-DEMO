# FORENSIC_CONTROL_TOWER_SUMMARY

**At:** 2026-09-17 · READ-ONLY · no implementation fixes

## Scores

| Field | Value |
|---|---|
| FORENSIC_RECONCILIATION | **COMPLETE for P0 causes** (hosted repro + DB + nav audit landed) |
| PRIOR_FINAL_RECEIPT_ACCURACY | **MATERIAL_OVERCLAIM** |
| CARMEN_CLIENTES_DEMO_REPRO | **FAIL** (`carmen.staging` / REAL Staging S.R.L.) · **PASS** contrast (`w2.people-admin` / SYNTH) — see `CARMEN_OWNER_PATH_REPRO.md` |
| DEMO_CONTEXT_PERSISTENCE | **FAIL** (URL/`datos=` dropped) · **PASS** cookie bridge on SYNTH people-admin sidebar nav · **N/A to fix Carmen empty** (wrong org) |
| ROOT_CAUSE_OF_ZERO_CLIENTS | Demo filter on **REAL Staging S.R.L.** (`01M2DV9F…`) = **0** DEMO parties; SYNTH has 5. Hosted: same Demo chrome, empty list. Banner/toggle ≠ rows. |
| APPROVAL_Q000015_SEMANTICS | Exception/request decision on quote subject; **does not create Pedido**; quote is **cancelled** smoke on REAL org |
| APPROVAL_SHOULD_CREATE_PEDIDO | **NO** |
| POST_APPROVAL_JOURNEY | **DEAD_END** (refresh + Volver to list; no Ver cotización / Convertir) |
| EXPECTED_PEDIDO_EXISTS | **NO** |
| ACTUAL_PEDIDO_EXISTS | **NO** |
| ROOT_CAUSE_OF_PEDIDO_OBSERVATION | Architecture + wrong quote (smoke) + no convert step |
| ACCEPTED_QUOTES_DEMO_VISIBLE | **NO** for Carmen (real scope / wrong org); SYNTH has DEMO accepted quotes in DB |
| WORK_DEMO_VISIBLE | **NO** for Carmen; SYNTH has 11 open work (assignee≠Carmen) |
| TOTAL_PAGES_PROVEN_POPULATED | **0 / 18** (Carmen row-level) |
| TOTAL_PAGES_PARTIAL | ~8 |
| TOTAL_PAGES_EMPTY | ≥3 observed |
| TOTAL_PAGES_BROKEN | ≥2 (Clientes demo empty; approval journey) |
| TOTAL_PAGES_NOT_ACTUALLY_TESTED | majority row-level |
| PF8_TRUE_USER_INTERACTIONS | **~5 / 33** |
| PF8_ACTUAL_CONTENT_ASSERTIONS | **~4 / 33** |
| STORY_MODE_NORMAL_NAV_PARITY | **FAIL** (Carmen) / PARTIAL (SYNTH) |
| DEMO_NAV_LINKS_AUDITED | **89** |
| DEMO_NAV_LINKS_DROPPING_STATE | **82** (4 PRESERVE query; cookie may still carry SSR demo) |
| OWNER_JOURNEY_DEAD_ENDS | ≥3 |
| QUOTE_PDF_SCOPE | **NORMAL PRODUCT** |
| DELIVERY_NOTE_PDF_SCOPE | **NORMAL PRODUCT** |
| DEMO_USES_SAME_PDF_IMPLEMENTATION | **YES** |
| REAL_SEVEN_MUTATED | **NO** |
| IMPLEMENTATION_FIXES_NEEDED | **12+** (plan only — do not implement in this pass) |

## P0 — blocks owner/demo use

1. **Demo mode is org-local filter, not SYNTH switch** — `carmen.staging` cannot see densify data; Story CTA → “Cliente no disponible”. people-admin on SYNTH lists DEMO clients (hosted PASS).
2. **82/89 navigations drop `datos=demo`** — cookie bridge works on SYNTH; still fragile; owner screenshots showed Datos reales on accepted/trabajo.
3. **PF-8 overclaim** — demoCue/HTTP ≠ populated lists; actor was people-admin SYNTH, not Carmen.
4. **Approval UX dead-end** after correct non-Pedido semantics (missing continue-to-quote CTA).

## P1 — before Isa/Álvaro

5. Story Mode hrefs omit `datos=demo` (steps 1–20).
6. Trabajo assignment vs owner evaluation visibility.
7. Accepted quotes filter vs DEMO naming (`SYNTH Wave2 Cliente` vs DEMO*).
8. Orphan pending approval on cancelled Q-000015.
9. Strengthen BV to assert named DEMO rows + cookie-only nav + Carmen-equivalent org path.
10. Pedidos index / commercial graph normal-nav proofs.

## P2 — polish

11. Micro-tour panels — confirm non-competing (allowed); ensure no scope loss.
12. Audit/finanzas/map row-level demo densify BV.
13. Approval success → deep link to subject quote.

## Artifact index

All under `docs/operations/ct3-owner-demo-completeness-2026-09-17/`:

- FORENSIC_FREEZE.md
- POST_FINISH_FULL_CHANGE_MANIFEST.md
- PF1_PF8_RECONCILIATION.md
- DEMO_SEED_ACTUAL_STATE.md
- DEMO_MODE_STATE_RECONCILIATION.md
- DEMO_PAGE_COVERAGE_RECONCILIATION.md
- PF8_33_ASSERTION_BREAKDOWN.md
- CARMEN_OWNER_PATH_REPRO.md
- APPROVAL_QUOTE_ORDER_RECONCILIATION.md
- NAVIGATION_STATE_PRESERVATION_AUDIT.md
- OWNER_JOURNEY_DEAD_END_AUDIT.md
- STORY_MODE_20_STEP_RECONCILIATION.md
- CROSS_PAGE_RECORD_GRAPH.md
- POST_FINISH_CLAIM_AUDIT.md
- PDF_AND_ROLE_PREVIEW_FORENSIC.md
- FORENSIC_CONTROL_TOWER_SUMMARY.md (this file)
