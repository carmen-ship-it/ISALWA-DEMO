# V1_PRODUCT_DRIFT_REPORT — post PC closure

**Date:** 2026-09-17  
**LIVE:** RC2 FAIL tip `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**LOCAL:** dirty RC3 + Product Promise C/D closure (uncommitted)  
**C6:** `P-OPS-12` Compras OC write = **FUTURE_BY_DESIGN** (not an RC3 blocker)

---

## Post-closure counts (local)

| Metric | Count |
|---|---|
| PRODUCT_PROMISES_TOTAL | **118** |
| MATCH_LOCAL (intended behavior present locally) | **~95** |
| LOCAL_ONLY_EXPECTED_TO_SHIP | **~12** (RC3 auth/View As + C/D product fixes not on LIVE) |
| FUTURE_BY_DESIGN | **1+** (C6 Compras OC; other prior FUTURE rows preserved) |
| HIDDEN_UNTIL_READY | prior ledger rows preserved |
| REMOVED | GuidePanel / IntroCoach / MicroTourCoach / RoleQuickstart / ContextualMicroTip |
| MISSING_MUST_FIX | **0** |
| STALE_REMOVED_LOCAL | **0** |
| MANUAL_ACTIONS_EXPECTED | **42** |
| MANUAL_ACTIONS_REACHABLE_LOCAL | **41** (C6 OC write deferred) |
| MANUAL_ACTIONS_MISSING_LOCAL | **0** for V1-promised actions |
| LOOPS_WITH_DEAD_ENDS_LOCAL | **0** |
| VIEW_AS_SECURITY_GAPS | **0** |
| DEMO_CONTEXT_NAV_GAPS | **0** |
| WALKTHROUGH_VIOLATIONS | **0** |

---

## C status (Carmen-locked)

| ID | Decision | LOCAL status |
|---|---|---|
| C1 Escalar a Gerencia | MUST FIX | **DONE** — `EscalateApproval` + CTA + explicit Gerente pick |
| C2 Resolver incidencia | MUST FIX | **DONE** — `ResolveIssueForm` + action |
| C3 Confirm/Ignore | MUST FIX | **DONE** — wired handlers + record-sent |
| C4 Manual conversation | MUST FIX | **DONE** — POST + panel persist |
| C5 orderId lanes | MUST FIX | **DONE** — all ops lanes + desk init |
| C6 Compras OC | FUTURE_BY_DESIGN | **NO IMPL** |
| C7 View As nav | MUST FIX | **DONE** — `evaluationNavItemVisible` |
| C8 /clientes ops | MUST FIX | **DONE** — desk excluded |
| C9 ops/finance mutations | MUST FIX | **DONE** — gates + finance `mutationsBlocked` |
| C10 Acciones ⌘K | MUST FIX | **DONE** — suppressed under View As |
| C11 Demo nav | MUST FIX | **DONE** — `?datos=demo` on sidebar + brand |

---

## D status

| ID | Action | LOCAL |
|---|---|---|
| D1 GuidePanel | DELETED | gone |
| D2 RoleQuickstartPanel | DELETED | gone |
| D3 ContextualMicroTipCoach | DELETED | gone |
| D4 JOURNEYS launcher | RETIRED from product mounts | archived data only; no UI |

**Also removed (Carmen walkthrough correction):** IntroCoach multi-step + MicroTourCoach + Ayuda section recorridos. Remaining: IntroWelcome (FIRST_USE_INTRO), LearningMode (PASSIVE_HELP), Story Mode (sole multi-step).

---

## Visible non-Story guided elements (local)

| Element | Classification |
|---|---|
| Story Mode / Ver recorrido completo | CANONICAL full walkthrough |
| IntroWelcome Bienvenido / Entendido | FIRST_USE_INTRO |
| Modo aprendizaje (Ayuda) | PASSIVE_HELP |
| Repetir introducción (welcome only) | FIRST_USE_INTRO |

WALKTHROUGH_VIOLATIONS = **0**

---

## Category C remaining

*(none for V1 must-fix)*

## Category D remaining

*(none)*

---

## Cut implication

Implementation of must-fix C/D is locally complete.  
**READY_TO_CUT_RC3** still requires: FULL_BUILD PASS, TESTS PASS, then commit/push (separate step — **not done in this turn**).  
**DO NOT DEPLOY** until cut gate + hosted BV plan.
